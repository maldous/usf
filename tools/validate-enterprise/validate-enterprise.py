#!/usr/bin/env python3
"""USF enterprise evidence model validator.

This validator enforces the repository-level enterprise evidence model used by
implementation lanes. It validates shape, SoA-support coverage, proof evidence
register pins, threat/abuse posture, SDK governance, observability evidence
standards, access/resilience/incident/privacy posture, done-state governance,
Lane 1 closure-matrix linkage, Lane 4 observability operations evidence, and
Lane 3 assurance control-plane disposition. It does not execute proof commands
and does not claim ISO/SOC/staging/production/live-provider/full-dev/full-parity
readiness.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    from jsonschema import Draft202012Validator
except Exception:  # pragma: no cover - dependency is present in normal validation.
    Draft202012Validator = None


ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = Path("spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json")
SCHEMA_PATH = Path("spec/schemas/enterprise-evidence.schema.json")
SERVICE_CATALOGUE_PATH = Path("spec/instances/compose-service/service-catalogue.json")
RUNTIME_MANIFEST_PATH = Path("spec/instances/runtime-proof/runtime-application-compose-parity.json")
CLOSURE_MATRIX_PATH = Path("docs/architecture/compose-service-disposition-closure-matrix.json")
USF133_CLOSURE_TIER_GATE_PATH = Path("docs/architecture/usf-133-closure-tier-evidence-gate.json")
OPERATOR_ACCESS_MATRIX_PATH = Path("docs/architecture/operator-access-gateway-posture-matrix.json")
OPERATOR_ACCESS_REVIEW_DEPTH_PATH = Path(
    "docs/architecture/operator-admin-access-review-deprovisioning-proof-depth.json"
)
OPERATOR_ACCESS_LIFECYCLE_PROOF_PATH = Path(
    "docs/architecture/operator-access-review-deprovisioning-execution-proof.json"
)
GATEWAY_CLICKTHROUGH_MATRIX_PATH = Path("docs/architecture/gateway-clickthrough-access-substrate-matrix.json")
STATIC_ANALYSIS_MATRIX_PATH = Path("docs/architecture/static-analysis-quality-gate-disposition-matrix.json")
SONARQUBE_PROOF_BOUNDARY_PATH = Path("docs/architecture/sonarqube-service-semantic-proof-boundary.json")
SONARQUBE_ZERO_ISSUE_ASSURANCE_PATH = Path(
    "docs/architecture/sonarqube-zero-issue-quality-gate-assurance.json"
)
SENTRY_ERROR_MATRIX_PATH = Path("docs/architecture/sentry-error-monitoring-disposition-matrix.json")
SENTRY_PROOF_BOUNDARY_PATH = Path("docs/architecture/sentry-service-semantic-proof-boundary.json")
OBSERVABILITY_SERVICE_DEPTH_PATH = Path(
    "docs/architecture/observability-service-alerting-dashboard-incident-proof-depth.json"
)
OBSERVABILITY_OPERATIONS_EXECUTION_PROOF_PATH = Path(
    "docs/architecture/observability-alerting-dashboard-incident-execution-proof.json"
)
BACKUP_RESTORE_OPERATIONAL_DEPTH_PATH = Path(
    "docs/architecture/backup-restore-dr-rpo-rto-operational-proof-depth.json"
)
BACKUP_RESTORE_EXECUTION_PROOF_PATH = Path(
    "docs/architecture/backup-restore-dr-pitr-rpo-rto-execution-proof.json"
)
GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_PATH = Path(
    "docs/architecture/generated-client-external-developer-graphql-federation-delivery-proof-depth.json"
)
ENTERPRISE_ISO_STYLE_EVIDENCE_FOUNDATION_PATH = Path(
    "docs/architecture/enterprise-iso-style-evidence-foundation.json"
)
ENVIRONMENT_PROMOTION_PATH = Path("spec/instances/environment-promotion/environment-promotion-enterprise-standard.json")
OPERATOR_ACCESS_PROOF_PATH = Path("packages/proof/src/operator-access-proof.ts")
OPERATOR_ACCESS_LIFECYCLE_PROOF_SOURCE_PATH = Path("packages/proof/src/operator-access-lifecycle-proof.ts")
OBSERVABILITY_OPERATIONS_EXECUTION_PROOF_SOURCE_PATH = Path(
    "packages/proof/src/observability-operations-execution-proof.ts"
)
PACKAGE_PATH = Path("package.json")
MAKEFILE_PATH = Path("Makefile")
PLANTED_DEFECT_DIR = Path("tools/validate-enterprise/planted-defects")

RULES = {
    "USF-ENTERPRISE-001": ("blocking", "enterprise evidence model is missing or invalid"),
    "USF-ENTERPRISE-002": ("blocking", "SoA-support mapping coverage is incomplete"),
    "USF-ENTERPRISE-003": ("blocking", "enterprise evidence register row is incomplete"),
    "USF-ENTERPRISE-004": ("blocking", "threat model or abuse-case posture is incomplete"),
    "USF-ENTERPRISE-005": ("blocking", "SDK dependency governance is incomplete or unpinned"),
    "USF-ENTERPRISE-006": ("blocking", "logging tracing metrics or audit evidence standard is incomplete"),
    "USF-ENTERPRISE-007": ("blocking", "done-state governance is unsafe or overclaimed"),
    "USF-ENTERPRISE-008": ("blocking", "Lane 1 service disposition closure matrix lacks enterprise linkage"),
    "USF-ENTERPRISE-009": ("blocking", "access resilience incident or privacy posture is incomplete"),
    "USF-ENTERPRISE-010": ("blocking", "Lane 4 observability operations evidence is incomplete"),
    "USF-ENTERPRISE-011": ("blocking", "Lane 6 enterprise safety-control evidence is incomplete"),
    "USF-ENTERPRISE-012": ("blocking", "Lane 3 assurance control-plane disposition is incomplete"),
    "USF-ENTERPRISE-013": ("blocking", "Lane 3 assurance control-plane readiness or certification is overclaimed"),
    "USF-ENTERPRISE-014": ("blocking", "operator access or gateway posture matrix is incomplete or unsafe"),
    "USF-ENTERPRISE-015": ("blocking", "environment promotion standard is missing required stage or gate metadata"),
    "USF-ENTERPRISE-016": ("blocking", "environment promotion enterprise evidence or ownership is incomplete"),
    "USF-ENTERPRISE-017": ("blocking", "environment promotion provider, environment, or destructive semantics are unsafe"),
    "USF-ENTERPRISE-018": ("blocking", "environment promotion readiness or certification claim is overclaimed"),
    "USF-ENTERPRISE-019": ("blocking", "operator access proof command is missing or unsafe"),
    "USF-ENTERPRISE-020": ("blocking", "gateway and clickthrough access substrate posture is incomplete or unsafe"),
    "USF-ENTERPRISE-021": ("blocking", "static-analysis quality-gate disposition is incomplete or unsafe"),
    "USF-ENTERPRISE-022": ("blocking", "Sentry error-monitoring disposition is incomplete or unsafe"),
    "USF-ENTERPRISE-023": ("blocking", "SonarQube service proof boundary is incomplete or unsafe"),
    "USF-ENTERPRISE-024": ("blocking", "Sentry service proof boundary is incomplete or unsafe"),
    "USF-ENTERPRISE-025": (
        "blocking",
        "operator access review or deprovisioning depth is incomplete or overclaimed",
    ),
    "USF-ENTERPRISE-026": (
        "blocking",
        "observability service operations depth is incomplete or overclaimed",
    ),
    "USF-ENTERPRISE-027": (
        "blocking",
        "backup restore DR and RPO/RTO operational depth is incomplete or overclaimed",
    ),
    "USF-ENTERPRISE-028": (
        "blocking",
        "generated-client external-developer GraphQL federation delivery depth is incomplete or overclaimed",
    ),
    "USF-ENTERPRISE-029": (
        "blocking",
        "operator access-review and deprovisioning execution proof is incomplete or overclaimed",
    ),
    "USF-ENTERPRISE-030": (
        "blocking",
        "observability alerting dashboard incident execution proof is incomplete or overclaimed",
    ),
    "USF-ENTERPRISE-031": (
        "blocking",
        "backup restore DR PITR and RPO/RTO execution proof enterprise evidence is incomplete or overclaimed",
    ),
    "USF-ENTERPRISE-032": (
        "blocking",
        "enterprise ISO-style evidence foundation is incomplete or overclaimed",
    ),
    "USF-ENTERPRISE-SELFTEST": ("blocking", "planted enterprise defect did not raise its expected rule"),
}

REQUIRED_NON_CLAIMS = {
    "full-dev-readiness",
    "test-readiness",
    "staging-readiness",
    "production-readiness",
    "deployment-readiness",
    "live-provider-readiness",
    "soc-readiness",
    "iso27001-certification",
    "enterprise-production-readiness",
    "full-product-readiness",
}
REQUIRED_LANES = {"USF-185", "USF-186", "USF-187", "USF-188", "USF-189", "USF-190", "USF-191"}
REQUIRED_ENTERPRISE_FOUNDATION_ISSUES = {f"USF-{issue_number}" for issue_number in range(273, 289)}
APPROVED_LANES = REQUIRED_LANES
BLOCKED_LANES = REQUIRED_LANES - APPROVED_LANES
VALIDATOR_ROWS = {
    "validate-spec": "tools/validate-spec/validate-spec.py",
    "validate-bootstrap": "tools/validate-bootstrap/validate-bootstrap.py",
    "validate-parity": "tools/validate-parity/validate-parity.py",
    "validate-compose": "tools/validate-compose/validate-compose.py",
    "validate-runtime": "tools/validate-runtime/validate-runtime.py",
    "validate-enterprise": "tools/validate-enterprise/validate-enterprise.py",
}
REQUIRED_OBSERVABILITY_FIELDS = {
    "correlationId",
    "serviceId",
    "providerId",
    "adapterId",
    "runtimeMode",
    "tenantSafeContext",
    "outcome",
    "retryCount",
    "durationBucket",
    "safeReasonCode",
    "signalKind",
    "incidentBoundary",
    "redactionStatus",
    "tenantLabelPosture",
    "dashboardBoundary",
}
PROHIBITED_OBSERVABILITY_FIELDS = {
    "secret",
    "token",
    "rawEndpoint",
    "connectionString",
    "stackTrace",
    "rawSdkError",
    "providerPayload",
    "password",
    "privateKey",
    "rawSecret",
    "rawToken",
    "rawLogMessage",
    "unsafeLogMessage",
    "tenantName",
    "userEmail",
    "rawObjectKey",
}
LANE4_REQUIRED_ROWS = {
    "soaSupportMappings": {"usf-188-soa-observability-operations-control"},
    "evidenceRegister": {"usf-188-evidence-observability-operations-posture"},
    "threatModelAbuseCaseRegister": {"usf-188-threat-observability-operations"},
    "accessReviewPrivilegedOperationPosture": {"usf-188-access-observability-operator-surfaces"},
    "backupRestoreResiliencePosture": {"usf-188-resilience-observability-evidence-retention"},
    "incidentVulnerabilityManagementEvidence": {"usf-188-incident-observability-operations-boundary"},
    "privacyDataMinimisationPosture": {"usf-188-privacy-observability-tenant-safe-redaction"},
}
LANE4_REQUIRED_POSTURE_TOKENS = {
    "effectivenessState=",
    "riskStatement=",
    "threatFailureScenario=",
    "affectedAssetService=",
    "impact=",
    "likelihood=",
    "owner=",
    "treatment=",
    "reviewDate=2026-09-30",
    "followUpIssue=USF-159",
}
LANE4_OBSERVABILITY_TOKENS = {
    "loggingPosture=defined-only",
    "tracingPosture=defined-only",
    "metricsPosture=defined-only",
    "correlationIdPosture=defined-only",
    "tenantSafeRedactionPosture=defined-only",
    "rawSecretLeakage=blocked",
    "unsafeLogBoundary=message-template-only",
    "alertingWorkflow=deferred-with-owner",
    "dashboardWorkflow=deferred-with-owner",
    "incidentBoundary=explicit-local-evidence-only",
}
ASSURANCE_EFFECTIVENESS_STATES = {
    "defined-only",
    "implemented",
    "proven-local",
    "operating-evidence-present",
    "deferred-with-owner",
    "out-of-scope-with-rationale",
}
ASSURANCE_REQUIRED_RISK_FIELDS = {
    "riskStatement",
    "threatFailureScenario",
    "affectedAssetService",
    "impact",
    "likelihood",
    "owner",
    "treatment",
    "reviewDate",
    "followUpIssue",
}
ASSURANCE_EXCEPTION_FIELDS = {
    "exceptionOwner",
    "exceptionReason",
    "compensatingControl",
    "exceptionExpiry",
    "exceptionValidationCommand",
    "exceptionFollowUpIssue",
}
ASSURANCE_OVERCLAIM_MARKERS = {
    "certificationClaim=",
    "certificationClaimed=",
    "iso27001CertificationClaim=true",
    "socReadinessClaim=true",
    "fullDevReadinessClaim=true",
    "testReadinessClaim=true",
    "stagingReadinessClaim=true",
    "productionReadinessClaim=true",
    "deploymentReadinessClaim=true",
    "liveProviderReadinessClaim=true",
    "enterpriseProductionReadinessClaim=true",
    "fullProductReadinessClaim=true",
}
ASSURANCE_CONTROL_PLANES = {
    "sentry-error-monitoring": {
        "expectedState": "deferred-with-owner",
        "issue": "USF-170",
        "closureServiceId": "sentry",
        "rows": {
            "soaSupportMappings": "usf-187-sentry-error-monitoring-soa",
            "evidenceRegister": "usf-187-sentry-error-monitoring-evidence",
            "threatModelAbuseCaseRegister": "usf-187-sentry-error-monitoring-threat",
            "accessReviewPrivilegedOperationPosture": "usf-187-sentry-error-monitoring-access",
            "backupRestoreResiliencePosture": "usf-187-sentry-error-monitoring-risk-treatment",
            "incidentVulnerabilityManagementEvidence": "usf-187-sentry-error-monitoring-incident-vulnerability",
            "privacyDataMinimisationPosture": "usf-187-sentry-error-monitoring-privacy",
        },
    },
    "sonarqube-static-analysis": {
        "expectedState": "deferred-with-owner",
        "issue": "USF-171",
        "closureServiceId": "sonarqube",
        "rows": {
            "soaSupportMappings": "usf-187-sonarqube-static-analysis-soa",
            "evidenceRegister": "usf-187-sonarqube-static-analysis-evidence",
            "threatModelAbuseCaseRegister": "usf-187-sonarqube-static-analysis-threat",
            "accessReviewPrivilegedOperationPosture": "usf-187-sonarqube-static-analysis-access",
            "backupRestoreResiliencePosture": "usf-187-sonarqube-static-analysis-risk-treatment",
            "incidentVulnerabilityManagementEvidence": "usf-187-sonarqube-static-analysis-incident-vulnerability",
            "privacyDataMinimisationPosture": "usf-187-sonarqube-static-analysis-privacy",
        },
    },
    "security-scanning": {
        "expectedState": "defined-only",
        "issue": "USF-171",
        "closureServiceId": None,
        "rows": {
            "soaSupportMappings": "usf-187-security-scanning-soa",
            "evidenceRegister": "usf-187-security-scanning-evidence",
            "threatModelAbuseCaseRegister": "usf-187-security-scanning-threat",
            "accessReviewPrivilegedOperationPosture": "usf-187-security-scanning-access",
            "backupRestoreResiliencePosture": "usf-187-security-scanning-risk-treatment",
            "incidentVulnerabilityManagementEvidence": "usf-187-security-scanning-incident-vulnerability",
            "privacyDataMinimisationPosture": "usf-187-security-scanning-privacy",
        },
    },
}
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
PINNED_VERSION_RE = re.compile(r"^[0-9]+(?:\.[0-9]+){1,3}(?:[-+][0-9A-Za-z.-]+)?$")
DATE_RE = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
EFFECTIVENESS_STATES = {
    "defined-only",
    "implemented",
    "proven-local",
    "operating-evidence-present",
    "deferred-with-owner",
    "out-of-scope-with-rationale",
}
PLACEHOLDER_RE = re.compile(r"\b(?:TODO|TBD|unknown|missing|unassigned)\b", re.IGNORECASE)
LANE6_CONTROL_ROWS = {
    "usf-190-db-enterprise-safety-control": {
        "expectedState": "proven-local",
        "evidence": "evidence-usf-190-db-enterprise-safety-controls",
        "followUp": "USF-139",
    },
    "usf-190-authorization-enterprise-safety-control": {
        "expectedState": "proven-local",
        "evidence": "evidence-usf-190-authorization-enterprise-safety-controls",
        "followUp": "USF-141",
    },
    "usf-190-audit-enterprise-safety-control": {
        "expectedState": "proven-local",
        "evidence": "evidence-usf-190-audit-enterprise-safety-controls",
        "followUp": "USF-143",
    },
    "usf-190-config-secrets-enterprise-safety-control": {
        "expectedState": "proven-local",
        "evidence": "evidence-usf-190-config-secrets-enterprise-safety-controls",
        "followUp": "USF-145",
    },
    "usf-190-files-storage-enterprise-safety-control": {
        "expectedState": "proven-local",
        "evidence": "evidence-usf-190-files-storage-enterprise-safety-controls",
        "followUp": "USF-147",
    },
    "usf-190-backup-retention-legal-hold-boundary": {
        "expectedState": "deferred-with-owner",
        "evidence": "evidence-usf-190-backup-retention-legal-hold-boundary",
        "followUp": "USF-139,USF-147",
    },
    "usf-190-status-integrity-boundary": {
        "expectedState": "defined-only",
        "evidence": "evidence-usf-190-status-integrity-validator",
        "followUp": "USF-192",
    },
}
LANE6_EVIDENCE_ROWS = {row["evidence"] for row in LANE6_CONTROL_ROWS.values()}
LANE6_THREAT_ROWS = {
    "usf-190-threat-db-tenant-data-control",
    "usf-190-threat-authorization-pdp-control",
    "usf-190-threat-audit-evidence-control",
    "usf-190-threat-config-secrets-control",
    "usf-190-threat-files-storage-control",
    "usf-190-threat-backup-retention-legal-hold-control",
}
LANE6_POSTURE_ROWS = {
    "accessReviewPrivilegedOperationPosture": {
        "usf-190-access-authorization-privileged-boundary",
    },
    "backupRestoreResiliencePosture": {
        "usf-190-resilience-backup-retention-legal-hold-boundary",
    },
    "incidentVulnerabilityManagementEvidence": {
        "usf-190-incident-safety-control-posture",
    },
    "privacyDataMinimisationPosture": {
        "usf-190-privacy-data-classification-posture",
    },
}
LANE6_DEFERRAL_TOKENS = (
    "riskStatement=",
    "threatFailureScenario=",
    "affectedAssetService=",
    "impact=",
    "likelihood=",
    "owner=",
    "treatment=",
    "reviewDate=",
    "followUpIssue=",
)
LANE6_EXCEPTION_TOKENS = (
    "exceptionOwner=",
    "exceptionReason=",
    "compensatingControl=",
    "exceptionExpiry=",
)
OPERATOR_AUTH_REQUIREMENTS = {"operator-auth-required", "admin-auth-required"}
PROMOTION_STAGES = {"dev", "test", "staging", "production"}
PROMOTION_TOP_NON_CLAIMS = REQUIRED_NON_CLAIMS | {"usf-133-closure"}
PROMOTION_REQUIRED_MODEL_ROWS = {
    "soaSupportMappings": {"usf-193-soa-environment-promotion-standard"},
    "evidenceRegister": {"usf-193-evidence-environment-promotion-standard"},
    "threatModelAbuseCaseRegister": {"usf-193-threat-environment-promotion-overclaim"},
    "accessReviewPrivilegedOperationPosture": {"usf-193-access-environment-promotion-approvals"},
    "backupRestoreResiliencePosture": {"usf-193-resilience-environment-promotion-gates"},
    "incidentVulnerabilityManagementEvidence": {"usf-193-incident-environment-promotion-boundary"},
    "privacyDataMinimisationPosture": {"usf-193-privacy-environment-promotion-data-posture"},
}
PROMOTION_REQUIRED_ENTERPRISE_TOKENS = {
    "risk register",
    "Statement of Applicability",
    "tenant isolation",
    "admin/operator access",
    "data classification",
    "secrets",
    "structured logs",
    "alerting",
    "SAST",
    "backup/restore",
    "change approval",
    "customer-facing enterprise feature posture",
}
PROMOTION_REQUIRED_EVIDENCE_PACKAGE_TOKENS = {
    "environment",
    "commit SHA",
    "PR",
    "issue",
    "evidence id",
    "validation commands",
    "risk decision",
    "exception list",
    "approver",
    "review expiry",
    "non-claims",
}
PROMOTION_CLAIM_RULE_TOKENS = {
    "dev evidence must not satisfy test readiness",
    "test evidence must not satisfy staging readiness",
    "staging evidence must not satisfy production readiness",
    "production readiness requires explicit production-live evidence",
    "hermetic-mock provider mode must not satisfy",
    "destructive test semantics must not satisfy staging or production",
    "readiness claims must not exceed proof level",
    "ISO/SOC/certification",
}
GATEWAY_CLICKTHROUGH_REQUIRED_EVIDENCE_ROWS = {
    "soaSupportMappings": {"usf-180-soa-gateway-clickthrough-substrate"},
    "evidenceRegister": {"usf-180-evidence-gateway-clickthrough-substrate"},
    "threatModelAbuseCaseRegister": {"usf-180-threat-gateway-clickthrough-overclaim"},
    "accessReviewPrivilegedOperationPosture": {"usf-180-access-gateway-clickthrough-substrate"},
    "incidentVulnerabilityManagementEvidence": {"usf-180-incident-vulnerability-gateway-clickthrough"},
    "privacyDataMinimisationPosture": {"usf-180-privacy-gateway-clickthrough-substrate"},
}
GATEWAY_CLICKTHROUGH_REQUIRED_ISSUES = {
    "USF-180",
    "USF-169",
    "USF-155",
    "USF-179",
    "USF-193",
    "USF-184",
    "USF-192",
    "USF-133",
}
GATEWAY_CLICKTHROUGH_PROHIBITED_CLAIMS = REQUIRED_NON_CLAIMS | {
    "gateway-readiness",
    "clickthrough-readiness",
    "public-exposure-readiness",
}
STATIC_ANALYSIS_REQUIRED_EVIDENCE_ROWS = {
    "soaSupportMappings": {
        "usf-171-soa-static-analysis-quality-gate-disposition",
        "usf-204-soa-sonarqube-composed-proof",
    },
    "evidenceRegister": {
        "usf-171-evidence-static-analysis-quality-gate-disposition",
        "usf-204-evidence-sonarqube-composed-proof",
    },
    "threatModelAbuseCaseRegister": {"usf-171-threat-static-analysis-overclaim"},
    "accessReviewPrivilegedOperationPosture": {"usf-171-access-static-analysis-quality-gate"},
    "incidentVulnerabilityManagementEvidence": {"usf-171-incident-vulnerability-static-analysis"},
    "privacyDataMinimisationPosture": {"usf-171-privacy-static-analysis-quality-gate"},
}
STATIC_ANALYSIS_REQUIRED_ISSUES = {
    "USF-171",
    "USF-195",
    "USF-204",
    "USF-169",
    "USF-193",
    "USF-187",
    "USF-184",
    "USF-192",
    "USF-133",
}
STATIC_ANALYSIS_PROHIBITED_CLAIMS = REQUIRED_NON_CLAIMS | {
    "sonarqube-readiness",
    "quality-gate-readiness",
    "scanner-readiness",
    "vulnerability-clearance-readiness",
}
SONARQUBE_BOUNDARY_REQUIRED_EVIDENCE_ROWS = {
    "soaSupportMappings": {
        "usf-195-soa-sonarqube-proof-boundary",
        "soa-proof-proof-assurance-sonarqube",
        "usf-204-soa-sonarqube-composed-proof",
    },
    "evidenceRegister": {
        "usf-195-evidence-sonarqube-proof-boundary",
        "evidence-proof-proof-assurance-sonarqube",
        "usf-204-evidence-sonarqube-composed-proof",
    },
    "threatModelAbuseCaseRegister": {
        "usf-195-threat-sonarqube-overclaim",
        "usf-204-threat-sonarqube-composed-proof",
    },
    "sdkDependencyGovernance": {"sdk-usf-204-sonarqube-composed-quality-gate-provider-at-sonar-scan"},
    "accessReviewPrivilegedOperationPosture": {
        "usf-195-access-sonarqube-proof-boundary",
        "usf-204-access-sonarqube-composed-proof",
    },
    "backupRestoreResiliencePosture": {"usf-204-resilience-sonarqube-composed-proof"},
    "incidentVulnerabilityManagementEvidence": {
        "usf-195-incident-vulnerability-sonarqube-proof-boundary",
        "usf-204-incident-vulnerability-sonarqube-composed-proof",
    },
    "privacyDataMinimisationPosture": {
        "usf-195-privacy-sonarqube-proof-boundary",
        "usf-204-privacy-sonarqube-composed-proof",
    },
}
SONARQUBE_BOUNDARY_REQUIRED_ISSUES = {
    "USF-195",
    "USF-204",
    "USF-233",
    "USF-171",
    "USF-169",
    "USF-193",
    "USF-187",
    "USF-184",
    "USF-192",
    "USF-133",
}
SONARQUBE_BOUNDARY_REQUIRED_SERVICES = {"sonarqube", "sonar-postgres", "sonar-oidc-plugin"}
SONARQUBE_BOUNDARY_PROHIBITED_CLAIMS = STATIC_ANALYSIS_PROHIBITED_CLAIMS | {"usf-133-closure"}
SENTRY_ERROR_REQUIRED_EVIDENCE_ROWS = {
    "soaSupportMappings": {"usf-170-soa-sentry-error-monitoring-disposition"},
    "evidenceRegister": {"usf-170-evidence-sentry-error-monitoring-disposition"},
    "threatModelAbuseCaseRegister": {"usf-170-threat-sentry-overclaim"},
    "accessReviewPrivilegedOperationPosture": {"usf-170-access-sentry-error-monitoring"},
    "incidentVulnerabilityManagementEvidence": {"usf-170-incident-vulnerability-sentry-error-monitoring"},
    "privacyDataMinimisationPosture": {"usf-170-privacy-sentry-error-monitoring"},
}
SENTRY_ERROR_REQUIRED_ISSUES = {"USF-170", "USF-196", "USF-187", "USF-184", "USF-192", "USF-133"}
SENTRY_ERROR_PROHIBITED_CLAIMS = REQUIRED_NON_CLAIMS | {
    "sentry-readiness",
    "error-monitoring-readiness",
    "live-monitoring-readiness",
    "incident-readiness",
    "alerting-readiness",
}
SENTRY_BOUNDARY_REQUIRED_EVIDENCE_ROWS = {
    "soaSupportMappings": {
        "usf-196-soa-sentry-proof-boundary",
        "usf-205-soa-sentry-sdk-envelope-proof",
    },
    "evidenceRegister": {
        "usf-196-evidence-sentry-proof-boundary",
        "usf-205-evidence-sentry-sdk-envelope-proof",
    },
    "threatModelAbuseCaseRegister": {
        "usf-196-threat-sentry-overclaim",
        "usf-205-threat-sentry-sdk-envelope-proof",
    },
    "sdkDependencyGovernance": {"sdk-usf-205-sentry-sdk-envelope-provider-at-sentry-node"},
    "accessReviewPrivilegedOperationPosture": {
        "usf-196-access-sentry-proof-boundary",
        "usf-205-access-sentry-sdk-envelope-proof",
    },
    "backupRestoreResiliencePosture": {"usf-205-resilience-sentry-sdk-envelope-proof"},
    "incidentVulnerabilityManagementEvidence": {
        "usf-196-incident-vulnerability-sentry-proof-boundary",
        "usf-205-incident-vulnerability-sentry-sdk-envelope-proof",
    },
    "privacyDataMinimisationPosture": {
        "usf-196-privacy-sentry-proof-boundary",
        "usf-205-privacy-sentry-sdk-envelope-proof",
    },
}
SENTRY_BOUNDARY_REQUIRED_ISSUES = {
    "USF-196",
    "USF-205",
    "USF-159",
    "USF-169",
    "USF-193",
    "USF-170",
    "USF-187",
    "USF-184",
    "USF-192",
    "USF-133",
}
SENTRY_BOUNDARY_REQUIRED_SERVICES = {"sentry"}
SENTRY_BOUNDARY_PROHIBITED_CLAIMS = SENTRY_ERROR_PROHIBITED_CLAIMS | {"usf-133-closure"}
OBSERVABILITY_SERVICE_DEPTH_REQUIRED_EVIDENCE_ROWS = {
    "soaSupportMappings": {"soa-usf-218-observability-service-operations-depth"},
    "evidenceRegister": {"evidence-usf-218-observability-service-operations-depth-disposition"},
    "threatModelAbuseCaseRegister": {"threat-usf-218-observability-service-operations-overclaim"},
    "accessReviewPrivilegedOperationPosture": {"access-usf-218-observability-service-operator-boundary"},
    "backupRestoreResiliencePosture": {"resilience-usf-218-observability-service-operations-boundary"},
    "incidentVulnerabilityManagementEvidence": {"incident-usf-218-observability-alert-incident-boundary"},
    "privacyDataMinimisationPosture": {"privacy-usf-218-observability-service-data-boundary"},
}
BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_EVIDENCE_ROWS = {
    "soaSupportMappings": {"soa-usf-219-backup-restore-dr-rpo-rto-depth"},
    "evidenceRegister": {"evidence-usf-219-backup-restore-dr-rpo-rto-disposition"},
    "threatModelAbuseCaseRegister": {"threat-usf-219-backup-dr-rpo-rto-overclaim"},
    "backupRestoreResiliencePosture": {"resilience-usf-219-backup-restore-dr-rpo-rto-boundary"},
    "incidentVulnerabilityManagementEvidence": {"incident-usf-219-backup-restore-dr-boundary"},
    "privacyDataMinimisationPosture": {"privacy-usf-219-backup-restore-data-boundary"},
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
BACKUP_RESTORE_EXECUTION_REQUIRED_EVIDENCE_ROWS = {
    "soaSupportMappings": {"soa-usf-223-backup-restore-execution-proof"},
    "evidenceRegister": {
        "evidence-usf-223-backup-restore-execution-proof",
        "evidence-proof-proof-backup-operations",
    },
    "threatModelAbuseCaseRegister": {"threat-usf-223-backup-restore-overclaim"},
    "backupRestoreResiliencePosture": {"resilience-usf-223-backup-restore-execution-boundary"},
    "incidentVulnerabilityManagementEvidence": {"incident-usf-223-backup-restore-execution-boundary"},
    "privacyDataMinimisationPosture": {"privacy-usf-223-backup-restore-data-boundary"},
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
GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_REQUIRED_EVIDENCE_ROWS = {
    "soaSupportMappings": {"soa-usf-220-generated-client-graphql-delivery-depth"},
    "evidenceRegister": {"evidence-usf-220-generated-client-graphql-delivery-depth"},
    "threatModelAbuseCaseRegister": {"threat-usf-220-generated-client-graphql-overclaim"},
    "accessReviewPrivilegedOperationPosture": {"access-usf-220-generated-client-graphql-boundary"},
    "backupRestoreResiliencePosture": {"resilience-usf-220-generated-client-graphql-boundary"},
    "incidentVulnerabilityManagementEvidence": {"incident-usf-220-generated-client-graphql-boundary"},
    "privacyDataMinimisationPosture": {"privacy-usf-220-generated-client-graphql-boundary"},
}
GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_REQUIRED_ISSUES = {
    "USF-220",
    "USF-224",
    "USF-214",
    "USF-213",
    "USF-155",
    "USF-193",
    "USF-184",
    "USF-192",
    "USF-133",
}
GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_REQUIRED_SURFACES = {
    "graphql-runtime",
    "federation-runtime",
    "generated-sdk",
    "generated-client",
    "external-developer-platform",
    "client-distribution",
}
GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_PROHIBITED_CLAIMS = REQUIRED_NON_CLAIMS | {
    "usf-133-closure",
    "generated-sdk-readiness",
    "generated-client-readiness",
    "external-developer-platform-readiness",
    "graphql-runtime-readiness",
    "federation-readiness",
    "public-api-readiness",
}
OPERATOR_ACCESS_LIFECYCLE_REQUIRED_EVIDENCE_ROWS = {
    "soaSupportMappings": {"soa-usf-221-operator-lifecycle-execution-proof"},
    "evidenceRegister": {"evidence-usf-221-operator-lifecycle-execution-proof"},
    "threatModelAbuseCaseRegister": {"threat-usf-221-operator-lifecycle-overclaim"},
    "accessReviewPrivilegedOperationPosture": {"access-usf-221-operator-lifecycle-proof-boundary"},
    "backupRestoreResiliencePosture": {"resilience-usf-221-operator-lifecycle-proof-boundary"},
    "incidentVulnerabilityManagementEvidence": {"incident-usf-221-operator-lifecycle-boundary"},
    "privacyDataMinimisationPosture": {"privacy-usf-221-operator-lifecycle-boundary"},
}
OPERATOR_ACCESS_LIFECYCLE_REQUIRED_ISSUES = {
    "USF-221",
    "USF-217",
    "USF-169",
    "USF-180",
    "USF-184",
    "USF-192",
    "USF-193",
    "USF-133",
}
OPERATOR_ACCESS_LIFECYCLE_PROHIBITED_CLAIMS = REQUIRED_NON_CLAIMS | {
    "usf-133-closure",
    "operator-console-readiness",
    "public-operator-exposure",
    "provider-console-readiness",
    "identity-provider-lifecycle-readiness",
}
OBSERVABILITY_OPERATIONS_EXECUTION_REQUIRED_EVIDENCE_ROWS = {
    "soaSupportMappings": {"soa-usf-222-observability-operations-execution-proof"},
    "evidenceRegister": {"evidence-usf-222-observability-operations-execution-proof"},
    "threatModelAbuseCaseRegister": {"threat-usf-222-observability-operations-overclaim"},
    "accessReviewPrivilegedOperationPosture": {"access-usf-222-observability-operations-boundary"},
    "backupRestoreResiliencePosture": {"resilience-usf-222-observability-operations-boundary"},
    "incidentVulnerabilityManagementEvidence": {"incident-usf-222-observability-operations-boundary"},
    "privacyDataMinimisationPosture": {"privacy-usf-222-observability-operations-boundary"},
}
OBSERVABILITY_OPERATIONS_EXECUTION_REQUIRED_ISSUES = {
    "USF-222",
    "USF-218",
    "USF-159",
    "USF-170",
    "USF-196",
    "USF-205",
    "USF-184",
    "USF-192",
    "USF-193",
    "USF-133",
}
OBSERVABILITY_OPERATIONS_EXECUTION_PROHIBITED_CLAIMS = REQUIRED_NON_CLAIMS | {
    "usf-133-closure",
    "live-monitoring-readiness",
    "alerting-readiness",
    "dashboard-readiness",
    "incident-response-readiness",
    "sentry-service-readiness",
}
OBSERVABILITY_SERVICE_DEPTH_REQUIRED_ISSUES = {
    "USF-218",
    "USF-222",
    "USF-159",
    "USF-170",
    "USF-196",
    "USF-205",
    "USF-184",
    "USF-192",
    "USF-193",
    "USF-133",
}
OBSERVABILITY_SERVICE_DEPTH_REQUIRED_SERVICES = {
    "otel-collector",
    "prometheus",
    "grafana",
    "loki",
    "tempo",
    "alertmanager",
    "alloy",
    "sentry",
}
OBSERVABILITY_SERVICE_DEPTH_PROHIBITED_CLAIMS = REQUIRED_NON_CLAIMS | {
    "sentry-readiness",
    "alerting-readiness",
    "dashboard-readiness",
    "incident-readiness",
    "live-monitoring-readiness",
    "usf-133-closure",
}


def missing_required_non_claims(row: dict[str, Any]) -> set[str]:
    if "nonClaims" in row:
        return REQUIRED_NON_CLAIMS - set(row.get("nonClaims", []))
    row_text = json.dumps(row, sort_keys=True).lower()
    missing: set[str] = set()
    for claim in REQUIRED_NON_CLAIMS:
        spaced = claim.replace("-", " ")
        if claim not in row_text and spaced not in row_text:
            missing.add(claim)
    return missing


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
        return [item for item in self.items if item["severity"] in {"blocking", "error"}]

    def rule_ids(self) -> set[str]:
        return {item["ruleId"] for item in self.items}


def read_json(path: Path) -> Any:
    with (ROOT / path).open(encoding="utf-8") as handle:
        return json.load(handle)


def rows_by_id(rows: Any, key: str = "id") -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    if not isinstance(rows, list):
        return out
    for row in rows:
        if isinstance(row, dict) and isinstance(row.get(key), str):
            out[row[key]] = row
    return out


def row_texts(row: dict[str, Any]) -> list[str]:
    texts: list[str] = []
    for value in row.values():
        if isinstance(value, str):
            texts.append(value)
        elif isinstance(value, list):
            texts.extend(str(item) for item in value if isinstance(item, str))
    return texts


def text_has_field(texts: list[str], field: str) -> bool:
    needle = f"{field}="
    return any(text.startswith(needle) or f"; {needle}" in text for text in texts)


def text_has_exact_field(texts: list[str], field: str, value: str) -> bool:
    needle = f"{field}={value}"
    return any(text.startswith(needle) or f"; {needle}" in text for text in texts)


def binding_service_ids(binding: dict[str, Any]) -> list[str]:
    service_ids = binding.get("serviceCatalogueServiceIds")
    if isinstance(service_ids, list):
        return [str(item) for item in service_ids if isinstance(item, str)]
    service_id = binding.get("serviceCatalogueServiceId")
    return [str(service_id)] if isinstance(service_id, str) else []


def proof_scripts(package: dict[str, Any]) -> dict[str, str]:
    scripts = package.get("scripts") if isinstance(package, dict) else {}
    if not isinstance(scripts, dict):
        return {}
    return {
        name: command
        for name, command in scripts.items()
        if isinstance(command, str)
        and (
            name.startswith("proof:")
            or name
            in {
                "dev:smoke",
                "runtime:proof",
                "runtime:proof:in-memory",
                "runtime:proof:compose",
                "providers-proof",
            }
        )
    }


def service_deferred_reason(service: dict[str, Any]) -> str:
    bits: list[str] = []
    if service.get("requirementState") in {False, "deferred", "out-of-scope"}:
        bits.append(f"requirementState={service.get('requirementState')}")
    if service.get("environmentDisposition") in {
        "deferred",
        "out-of-scope",
        "external-managed",
        "cloud-provider",
    }:
        bits.append(f"environmentDisposition={service.get('environmentDisposition')}")
    if service.get("humanDecisionState") in {"requires-human-decision", "decision-required"}:
        bits.append(f"humanDecisionState={service.get('humanDecisionState')}")
    if service.get("missingEvidence"):
        bits.append("missingEvidence")
    return "; ".join(bits) if bits else "not-deferred"


def service_needs_access_posture(service: dict[str, Any]) -> bool:
    text = " ".join(
        str(service.get(key, "")) for key in ("serviceId", "displayName", "serviceKind", "semanticRoles")
    ).lower()
    return (
        any(marker in text for marker in ("operator", "admin", "gateway", "control-plane"))
        or service.get("accessModel") not in {None, "no-human-access"}
    )


def service_needs_operator_access_decision(service: dict[str, Any]) -> bool:
    service_kind = service.get("serviceKind")
    access_model = service.get("accessModel")
    return (
        service_kind
        in {"gateway", "observability-control-plane", "assurance-control-plane", "operator-automation", "workflow-operator-ui"}
        or service.get("adminSurface", {}).get("present") is True
        or service.get("operatorSurface", {}).get("present") is True
        or access_model in {"operator-access", "admin-only", "external-provider-console"}
    )


def local_publication(service: dict[str, Any]) -> str:
    ports = service.get("ports") or []
    if not ports:
        return "not-host-published"
    if all(
        port.get("hostIp") == "127.0.0.1"
        and port.get("bindScope") == "loopback-only"
        and port.get("internetExposureAllowed") is False
        for port in ports
        if isinstance(port, dict)
    ):
        return "loopback-only"
    return "non-loopback-present"


def service_needs_resilience_posture(service: dict[str, Any]) -> bool:
    return service.get("dataBoundary") not in {None, "none"} or service.get("serviceKind") in {
        "database",
        "object-storage",
        "secret-store",
        "event-bus",
        "workflow-runtime",
        "identity-provider",
        "identity-backing-store",
    }


def load_state(defect: dict[str, Any] | None = None) -> dict[str, Any]:
    defect = defect or {}
    model = read_json(MODEL_PATH)
    schema = read_json(SCHEMA_PATH)
    service_catalogue = read_json(SERVICE_CATALOGUE_PATH)
    runtime_manifest = read_json(RUNTIME_MANIFEST_PATH)
    package = read_json(PACKAGE_PATH)
    makefile = (ROOT / MAKEFILE_PATH).read_text(encoding="utf-8")
    closure_matrix = read_json(CLOSURE_MATRIX_PATH) if (ROOT / CLOSURE_MATRIX_PATH).exists() else None
    usf133_closure_tier_gate = (
        read_json(USF133_CLOSURE_TIER_GATE_PATH)
        if (ROOT / USF133_CLOSURE_TIER_GATE_PATH).exists()
        else None
    )
    operator_access_matrix = (
        read_json(OPERATOR_ACCESS_MATRIX_PATH) if (ROOT / OPERATOR_ACCESS_MATRIX_PATH).exists() else None
    )
    operator_access_review_depth = (
        read_json(OPERATOR_ACCESS_REVIEW_DEPTH_PATH) if (ROOT / OPERATOR_ACCESS_REVIEW_DEPTH_PATH).exists() else None
    )
    operator_access_lifecycle_proof = (
        read_json(OPERATOR_ACCESS_LIFECYCLE_PROOF_PATH)
        if (ROOT / OPERATOR_ACCESS_LIFECYCLE_PROOF_PATH).exists()
        else None
    )
    gateway_clickthrough_matrix = (
        read_json(GATEWAY_CLICKTHROUGH_MATRIX_PATH) if (ROOT / GATEWAY_CLICKTHROUGH_MATRIX_PATH).exists() else None
    )
    static_analysis_matrix = read_json(STATIC_ANALYSIS_MATRIX_PATH) if (ROOT / STATIC_ANALYSIS_MATRIX_PATH).exists() else None
    sonarqube_proof_boundary = (
        read_json(SONARQUBE_PROOF_BOUNDARY_PATH) if (ROOT / SONARQUBE_PROOF_BOUNDARY_PATH).exists() else None
    )
    sonarqube_zero_issue_assurance = (
        read_json(SONARQUBE_ZERO_ISSUE_ASSURANCE_PATH)
        if (ROOT / SONARQUBE_ZERO_ISSUE_ASSURANCE_PATH).exists()
        else None
    )
    sentry_error_matrix = read_json(SENTRY_ERROR_MATRIX_PATH) if (ROOT / SENTRY_ERROR_MATRIX_PATH).exists() else None
    sentry_proof_boundary = (
        read_json(SENTRY_PROOF_BOUNDARY_PATH) if (ROOT / SENTRY_PROOF_BOUNDARY_PATH).exists() else None
    )
    observability_service_depth = (
        read_json(OBSERVABILITY_SERVICE_DEPTH_PATH)
        if (ROOT / OBSERVABILITY_SERVICE_DEPTH_PATH).exists()
        else None
    )
    observability_operations_execution_proof = (
        read_json(OBSERVABILITY_OPERATIONS_EXECUTION_PROOF_PATH)
        if (ROOT / OBSERVABILITY_OPERATIONS_EXECUTION_PROOF_PATH).exists()
        else None
    )
    backup_restore_operational_depth = (
        read_json(BACKUP_RESTORE_OPERATIONAL_DEPTH_PATH)
        if (ROOT / BACKUP_RESTORE_OPERATIONAL_DEPTH_PATH).exists()
        else None
    )
    backup_restore_execution_proof = (
        read_json(BACKUP_RESTORE_EXECUTION_PROOF_PATH)
        if (ROOT / BACKUP_RESTORE_EXECUTION_PROOF_PATH).exists()
        else None
    )
    generated_client_graphql_delivery_depth = (
        read_json(GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_PATH)
        if (ROOT / GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_PATH).exists()
        else None
    )
    enterprise_iso_style_evidence_foundation = (
        read_json(ENTERPRISE_ISO_STYLE_EVIDENCE_FOUNDATION_PATH)
        if (ROOT / ENTERPRISE_ISO_STYLE_EVIDENCE_FOUNDATION_PATH).exists()
        else None
    )
    environment_promotion = (
        read_json(ENVIRONMENT_PROMOTION_PATH) if (ROOT / ENVIRONMENT_PROMOTION_PATH).exists() else None
    )
    operator_access_proof_text = (
        (ROOT / OPERATOR_ACCESS_PROOF_PATH).read_text(encoding="utf-8")
        if (ROOT / OPERATOR_ACCESS_PROOF_PATH).exists()
        else None
    )
    operator_access_lifecycle_proof_text = (
        (ROOT / OPERATOR_ACCESS_LIFECYCLE_PROOF_SOURCE_PATH).read_text(encoding="utf-8")
        if (ROOT / OPERATOR_ACCESS_LIFECYCLE_PROOF_SOURCE_PATH).exists()
        else None
    )
    observability_operations_execution_proof_text = (
        (ROOT / OBSERVABILITY_OPERATIONS_EXECUTION_PROOF_SOURCE_PATH).read_text(encoding="utf-8")
        if (ROOT / OBSERVABILITY_OPERATIONS_EXECUTION_PROOF_SOURCE_PATH).exists()
        else None
    )

    model = apply_model_defect(model, defect)
    if closure_matrix is not None:
        closure_matrix = apply_closure_defect(closure_matrix, defect)
    if usf133_closure_tier_gate is not None:
        usf133_closure_tier_gate = apply_usf133_closure_tier_gate_defect(usf133_closure_tier_gate, defect)
    if operator_access_matrix is not None:
        operator_access_matrix = apply_operator_access_defect(operator_access_matrix, defect)
    if defect.get("removeOperatorAccessReviewDepth"):
        operator_access_review_depth = None
    elif operator_access_review_depth is not None:
        operator_access_review_depth = apply_operator_access_review_depth_defect(operator_access_review_depth, defect)
    if defect.get("removeOperatorAccessLifecycleProof"):
        operator_access_lifecycle_proof = None
    elif operator_access_lifecycle_proof is not None:
        operator_access_lifecycle_proof = apply_operator_access_lifecycle_proof_defect(
            operator_access_lifecycle_proof,
            defect,
        )
    if defect.get("removeGatewayClickthroughMatrix"):
        gateway_clickthrough_matrix = None
    elif gateway_clickthrough_matrix is not None:
        gateway_clickthrough_matrix = apply_gateway_clickthrough_defect(gateway_clickthrough_matrix, defect)
    if defect.get("removeStaticAnalysisMatrix"):
        static_analysis_matrix = None
    elif static_analysis_matrix is not None:
        static_analysis_matrix = apply_static_analysis_defect(static_analysis_matrix, defect)
    if defect.get("removeSonarqubeBoundary"):
        sonarqube_proof_boundary = None
    elif sonarqube_proof_boundary is not None:
        sonarqube_proof_boundary = apply_sonarqube_boundary_defect(sonarqube_proof_boundary, defect)
    if defect.get("removeSonarqubeZeroIssueAssurance"):
        sonarqube_zero_issue_assurance = None
    elif sonarqube_zero_issue_assurance is not None:
        sonarqube_zero_issue_assurance = apply_sonarqube_zero_issue_defect(
            sonarqube_zero_issue_assurance,
            defect,
        )
    if defect.get("removeSentryErrorMatrix"):
        sentry_error_matrix = None
    elif sentry_error_matrix is not None:
        sentry_error_matrix = apply_sentry_error_defect(sentry_error_matrix, defect)
    if defect.get("removeSentryBoundary"):
        sentry_proof_boundary = None
    elif sentry_proof_boundary is not None:
        sentry_proof_boundary = apply_sentry_boundary_defect(sentry_proof_boundary, defect)
    if defect.get("removeObservabilityServiceDepth"):
        observability_service_depth = None
    elif observability_service_depth is not None:
        observability_service_depth = apply_observability_service_depth_defect(observability_service_depth, defect)
    if defect.get("removeObservabilityOperationsExecutionProof"):
        observability_operations_execution_proof = None
    elif observability_operations_execution_proof is not None:
        observability_operations_execution_proof = apply_observability_operations_execution_defect(
            observability_operations_execution_proof,
            defect,
        )
    if defect.get("removeBackupRestoreOperationalDepth"):
        backup_restore_operational_depth = None
    elif backup_restore_operational_depth is not None:
        backup_restore_operational_depth = apply_backup_restore_operational_depth_defect(
            backup_restore_operational_depth,
            defect,
        )
    if defect.get("removeBackupRestoreExecutionProof"):
        backup_restore_execution_proof = None
    elif backup_restore_execution_proof is not None:
        backup_restore_execution_proof = apply_backup_restore_operational_depth_defect(
            backup_restore_execution_proof,
            {
                "backupRestoreOperationalDepthSet": defect.get("backupRestoreExecutionProofSet", {}),
                "backupRestoreOperationalDepthDrop": defect.get("backupRestoreExecutionProofDrop", []),
            },
        )
    if defect.get("removeGeneratedClientGraphqlDeliveryDepth"):
        generated_client_graphql_delivery_depth = None
    elif generated_client_graphql_delivery_depth is not None:
        generated_client_graphql_delivery_depth = apply_generated_client_graphql_delivery_depth_defect(
            generated_client_graphql_delivery_depth,
            defect,
        )
    if defect.get("removeEnterpriseIsoStyleEvidenceFoundation"):
        enterprise_iso_style_evidence_foundation = None
    elif enterprise_iso_style_evidence_foundation is not None:
        enterprise_iso_style_evidence_foundation = apply_enterprise_iso_style_foundation_defect(
            enterprise_iso_style_evidence_foundation,
            defect,
        )
    if environment_promotion is not None:
        environment_promotion = apply_environment_promotion_defect(environment_promotion, defect)
    package = apply_package_defect(package, defect)
    if operator_access_proof_text is not None:
        operator_access_proof_text = apply_operator_access_proof_defect(operator_access_proof_text, defect)
    if operator_access_lifecycle_proof_text is not None:
        operator_access_lifecycle_proof_text = apply_operator_access_proof_defect(
            operator_access_lifecycle_proof_text,
            defect,
        )
    if observability_operations_execution_proof_text is not None:
        observability_operations_execution_proof_text = apply_operator_access_proof_defect(
            observability_operations_execution_proof_text,
            defect,
        )
    return {
        "model": model,
        "schema": schema,
        "serviceCatalogue": service_catalogue,
        "runtimeManifest": runtime_manifest,
        "package": package,
        "makefile": makefile,
        "closureMatrix": closure_matrix,
        "usf133ClosureTierGate": usf133_closure_tier_gate,
        "operatorAccessMatrix": operator_access_matrix,
        "operatorAccessReviewDepth": operator_access_review_depth,
        "operatorAccessLifecycleProof": operator_access_lifecycle_proof,
        "gatewayClickthroughMatrix": gateway_clickthrough_matrix,
        "staticAnalysisMatrix": static_analysis_matrix,
        "sonarqubeProofBoundary": sonarqube_proof_boundary,
        "sonarqubeZeroIssueAssurance": sonarqube_zero_issue_assurance,
        "sentryErrorMatrix": sentry_error_matrix,
        "sentryProofBoundary": sentry_proof_boundary,
        "observabilityServiceDepth": observability_service_depth,
        "observabilityOperationsExecutionProof": observability_operations_execution_proof,
        "backupRestoreOperationalDepth": backup_restore_operational_depth,
        "backupRestoreExecutionProof": backup_restore_execution_proof,
        "generatedClientGraphqlDeliveryDepth": generated_client_graphql_delivery_depth,
        "enterpriseIsoStyleEvidenceFoundation": enterprise_iso_style_evidence_foundation,
        "environmentPromotion": environment_promotion,
        "operatorAccessProofText": operator_access_proof_text,
        "operatorAccessLifecycleProofText": operator_access_lifecycle_proof_text,
        "observabilityOperationsExecutionProofText": observability_operations_execution_proof_text,
    }


def apply_package_defect(package: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(package)
    scripts = out.setdefault("scripts", {})
    for key in defect.get("packageScriptDrop", []):
        scripts.pop(key, None)
    for key, value in defect.get("packageScriptSet", {}).items():
        scripts[key] = value
    return out


def apply_enterprise_iso_style_foundation_defect(
    foundation: dict[str, Any],
    defect: dict[str, Any],
) -> dict[str, Any]:
    out = copy.deepcopy(foundation)
    for issue_id in defect.get("dropEnterpriseIsoDomainIssueIds", []):
        out["domains"] = [
            row for row in out.get("domains", []) if row.get("issueId") != issue_id
        ]
        out["controlMatrix"] = [
            row for row in out.get("controlMatrix", []) if row.get("issueId") != issue_id
        ]
        out["riskRegister"] = [
            row for row in out.get("riskRegister", []) if row.get("issueId") != issue_id
        ]
    for patch in defect.get("enterpriseIsoDomainPatch", []):
        for row in out.get("domains", []):
            if row.get("issueId") == patch.get("issueId") or row.get("domainId") == patch.get("domainId"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
    for owner_id in defect.get("dropEnterpriseIsoOwnerRegistryIds", []):
        registry = out.get("ownerRegistry")
        if isinstance(registry, dict):
            registry.pop(owner_id, None)
    for patch in defect.get("enterpriseIsoControlPatch", []):
        for row in out.get("controlMatrix", []):
            if row.get("issueId") == patch.get("issueId") or row.get("controlId") == patch.get("controlId"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
    for patch in defect.get("enterpriseIsoRiskPatch", []):
        for row in out.get("riskRegister", []):
            if row.get("issueId") == patch.get("issueId") or row.get("riskId") == patch.get("riskId"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
    if "setEnterpriseIsoCertificationClaim" in defect:
        out.setdefault("frameworkBoundary", {})["iso27001CertificationClaim"] = defect[
            "setEnterpriseIsoCertificationClaim"
        ]
    if "setEnterpriseIsoBlocksStaging" in defect:
        out["stagingSpecificEnablementBlockedByThisTrack"] = defect[
            "setEnterpriseIsoBlocksStaging"
        ]
    return out


def apply_operator_access_proof_defect(text: str, defect: dict[str, Any]) -> str:
    out = text
    for replacement in defect.get("operatorAccessProofTextReplace", []):
        if isinstance(replacement, dict):
            out = out.replace(str(replacement.get("from", "")), str(replacement.get("to", "")))
    if defect.get("operatorAccessProofTextAppend"):
        out += str(defect["operatorAccessProofTextAppend"])
    return out


def apply_model_defect(model: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(model)
    if defect.get("removeSoaMapping"):
        out["soaSupportMappings"] = [
            row for row in out.get("soaSupportMappings", []) if row.get("id") != defect["removeSoaMapping"]
        ]
    for patch in defect.get("soaPatch", []):
        for row in out.get("soaSupportMappings", []):
            if row.get("id") == patch.get("id"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
    for patch in defect.get("threatPatch", []):
        for row in out.get("threatModelAbuseCaseRegister", []):
            if row.get("id") == patch.get("id"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
    if defect.get("removeThreatModel"):
        out["threatModelAbuseCaseRegister"] = [
            row
            for row in out.get("threatModelAbuseCaseRegister", [])
            if row.get("id") != defect["removeThreatModel"]
        ]
    if defect.get("removeEnterpriseEvidence"):
        out["evidenceRegister"] = [
            row
            for row in out.get("evidenceRegister", [])
            if row.get("id") != defect["removeEnterpriseEvidence"]
        ]
    if defect.get("observabilityDropRequiredField"):
        field = defect["observabilityDropRequiredField"]
        out.get("observabilityEvidenceStandard", {}).setdefault("requiredFields", [])
        out["observabilityEvidenceStandard"]["requiredFields"] = [
            item for item in out["observabilityEvidenceStandard"]["requiredFields"] if item != field
        ]
    if defect.get("observabilityDropProhibitedField"):
        field = defect["observabilityDropProhibitedField"]
        out.get("observabilityEvidenceStandard", {}).setdefault("prohibitedFields", [])
        out["observabilityEvidenceStandard"]["prohibitedFields"] = [
            item for item in out["observabilityEvidenceStandard"]["prohibitedFields"] if item != field
        ]
    for patch in defect.get("evidencePatch", []):
        for row in out.get("evidenceRegister", []):
            if row.get("id") == patch.get("id"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
    for patch in defect.get("sdkPatch", []):
        for row in out.get("sdkDependencyGovernance", []):
            if row.get("id") == patch.get("id"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
    for patch in defect.get("posturePatch", []):
        section = patch.get("section")
        if not isinstance(section, str) or not isinstance(out.get(section), list):
            continue
        for row in out.get(section, []):
            if row.get("id") != patch.get("id"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
            if patch.get("dropNonClaims"):
                dropped = set(patch.get("dropNonClaims", []))
                row["nonClaims"] = [item for item in row.get("nonClaims", []) if item not in dropped]
            if patch.get("removePosturePrefix"):
                prefixes = tuple(str(item) for item in patch.get("removePosturePrefix", []))
                row["posture"] = [
                    item for item in row.get("posture", []) if not str(item).startswith(prefixes)
                ]
            if patch.get("appendPosture"):
                row.setdefault("posture", [])
                row["posture"].extend(str(item) for item in patch.get("appendPosture", []))
    for key, value in defect.get("doneStateSet", {}).items():
        out.setdefault("doneStateGovernance", {})[key] = value
    for patch in defect.get("laneRequirementPatch", []):
        for row in out.get("laneEvidenceRequirements", []):
            if row.get("laneIssue") == patch.get("laneIssue"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
    return out


def apply_closure_defect(matrix: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(matrix)
    for key, value in defect.get("closureMatrixTopSet", {}).items():
        out[key] = value
    service_id = defect.get("removeClosureEnterpriseRefs")
    if service_id:
        for row in out.get("rows", []):
            if row.get("service_id") == service_id:
                row.get("closure_evidence", {}).pop("enterprise_evidence_refs", None)
    for patch in defect.get("closureServicePatch", []):
        for row in out.get("rows", []):
            if row.get("service_id") != patch.get("serviceId"):
                continue
            evidence = row.setdefault("closure_evidence", {})
            for key in patch.get("drop", []):
                drop_nested_value(evidence, key)
            for key, value in patch.get("set", {}).items():
                set_nested_value(evidence, key, value)
    return out


def apply_usf133_closure_tier_gate_defect(gate: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(gate)
    for patch in defect.get("closureTierServiceRefPatch", []):
        for row in out.get("requiredServiceDispositionRefs", []):
            if row.get("serviceId") != patch.get("serviceId"):
                continue
            for key in patch.get("drop", []):
                drop_nested_value(row, key)
            for key, value in patch.get("set", {}).items():
                set_nested_value(row, key, value)
    for patch in defect.get("closureTierExceptionPatch", []):
        for row in out.get("enterpriseExceptionRegister", []):
            if row.get("id") != patch.get("id"):
                continue
            for key in patch.get("drop", []):
                drop_nested_value(row, key)
            for key, value in patch.get("set", {}).items():
                set_nested_value(row, key, value)
    return out


def apply_operator_access_defect(matrix: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(matrix)
    for key, value in defect.get("operatorAccessTopSet", {}).items():
        out[key] = value
    remove_row_id = defect.get("removeOperatorAccessRow")
    if remove_row_id:
        out["rows"] = [row for row in out.get("rows", []) if row.get("id") != remove_row_id]
    for patch in defect.get("operatorAccessPatch", []):
        for row in out.get("rows", []):
            if row.get("id") == patch.get("id"):
                for key in patch.get("drop", []):
                    row.pop(key, None)
                for key, value in patch.get("set", {}).items():
                    row[key] = value
    return out


def apply_operator_access_review_depth_defect(matrix: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(matrix)
    for key, value in defect.get("operatorAccessReviewDepthTopSet", {}).items():
        out[key] = value
    remove_row_id = defect.get("removeOperatorAccessReviewDepthRow")
    if remove_row_id:
        out["rows"] = [row for row in out.get("rows", []) if row.get("id") != remove_row_id]
    for patch in defect.get("operatorAccessReviewDepthPatch", []):
        for row in out.get("rows", []):
            if row.get("id") == patch.get("id"):
                for key in patch.get("drop", []):
                    drop_nested_value(row, key)
                for key, value in patch.get("set", {}).items():
                    set_nested_value(row, key, value)
    return out


def apply_operator_access_lifecycle_proof_defect(matrix: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(matrix)
    for key, value in defect.get("operatorAccessLifecycleTopSet", {}).items():
        set_nested_value(out, key, value)
    for key in defect.get("operatorAccessLifecycleTopDrop", []):
        drop_nested_value(out, key)
    remove_service_id = defect.get("removeOperatorAccessLifecycleServiceRow")
    if remove_service_id:
        out["serviceExecutionRows"] = [
            row for row in out.get("serviceExecutionRows", []) if row.get("serviceId") != remove_service_id
        ]
    if defect.get("dropOperatorAccessLifecycleEnterpriseEvidenceRef"):
        dropped = defect["dropOperatorAccessLifecycleEnterpriseEvidenceRef"]
        out["enterpriseEvidenceRefs"] = [
            item for item in out.get("enterpriseEvidenceRefs", []) if item != dropped
        ]
    for patch in defect.get("operatorAccessLifecycleServicePatch", []):
        for row in out.get("serviceExecutionRows", []):
            if row.get("serviceId") != patch.get("serviceId"):
                continue
            for key in patch.get("drop", []):
                drop_nested_value(row, key)
            for key, value in patch.get("set", {}).items():
                set_nested_value(row, key, value)
    return out


def set_nested_value(target: dict[str, Any], dotted_path: str, value: Any) -> None:
    parts = [part for part in dotted_path.split(".") if part]
    if not parts:
        return
    cursor: dict[str, Any] = target
    for part in parts[:-1]:
        next_value = cursor.setdefault(part, {})
        if not isinstance(next_value, dict):
            next_value = {}
            cursor[part] = next_value
        cursor = next_value
    cursor[parts[-1]] = value


def drop_nested_value(target: dict[str, Any], dotted_path: str) -> None:
    parts = [part for part in dotted_path.split(".") if part]
    if not parts:
        return
    cursor: Any = target
    for part in parts[:-1]:
        if not isinstance(cursor, dict):
            return
        cursor = cursor.get(part)
    if isinstance(cursor, dict):
        cursor.pop(parts[-1], None)


def apply_gateway_clickthrough_defect(matrix: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(matrix)
    for key, value in defect.get("gatewayClickthroughSet", {}).items():
        set_nested_value(out, key, value)
    for key in defect.get("gatewayClickthroughDrop", []):
        drop_nested_value(out, key)
    return out


def apply_static_analysis_defect(matrix: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(matrix)
    for key, value in defect.get("staticAnalysisSet", {}).items():
        set_nested_value(out, key, value)
    for key in defect.get("staticAnalysisDrop", []):
        drop_nested_value(out, key)
    return out


def apply_sonarqube_boundary_defect(boundary: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(boundary)
    for key, value in defect.get("sonarqubeBoundarySet", {}).items():
        set_nested_value(out, key, value)
    for key in defect.get("sonarqubeBoundaryDrop", []):
        drop_nested_value(out, key)
    return out


def apply_sonarqube_zero_issue_defect(assurance: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(assurance)
    for key, value in defect.get("sonarqubeZeroIssueSet", {}).items():
        set_nested_value(out, key, value)
    for key in defect.get("sonarqubeZeroIssueDrop", []):
        drop_nested_value(out, key)
    return out


def apply_sentry_error_defect(matrix: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(matrix)
    for key, value in defect.get("sentryErrorSet", {}).items():
        set_nested_value(out, key, value)
    for key in defect.get("sentryErrorDrop", []):
        drop_nested_value(out, key)
    return out


def apply_sentry_boundary_defect(boundary: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(boundary)
    for key, value in defect.get("sentryBoundarySet", {}).items():
        set_nested_value(out, key, value)
    for key in defect.get("sentryBoundaryDrop", []):
        drop_nested_value(out, key)
    return out


def apply_observability_service_depth_defect(depth: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(depth)
    for key, value in defect.get("observabilityServiceDepthSet", {}).items():
        set_nested_value(out, key, value)
    for key in defect.get("observabilityServiceDepthDrop", []):
        drop_nested_value(out, key)
    remove_boundary = defect.get("removeObservabilityServiceDepthBoundary")
    if remove_boundary:
        out["boundaries"] = [
            row for row in out.get("boundaries", []) if row.get("id") != remove_boundary
        ]
    for patch in defect.get("observabilityServiceDepthBoundaryPatch", []):
        row = next((r for r in out.get("boundaries", []) if r.get("id") == patch["id"]), None)
        if row is None:
            continue
        for key, value in patch.get("set", {}).items():
            set_nested_value(row, key, value)
        for key in patch.get("drop", []):
            drop_nested_value(row, key)
    for patch in defect.get("observabilityServiceDepthDispositionPatch", []):
        row = next(
            (r for r in out.get("serviceBindingDispositions", []) if r.get("serviceId") == patch["serviceId"]),
            None,
        )
        if row is None:
            continue
        for key, value in patch.get("set", {}).items():
            set_nested_value(row, key, value)
        for key in patch.get("drop", []):
            drop_nested_value(row, key)
    return out


def apply_observability_operations_execution_defect(depth: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(depth)
    for key, value in defect.get("observabilityOperationsExecutionSet", {}).items():
        set_nested_value(out, key, value)
    for key in defect.get("observabilityOperationsExecutionDrop", []):
        drop_nested_value(out, key)
    remove_service = defect.get("removeObservabilityOperationsExecutionServiceRow")
    if remove_service:
        out["serviceBindingDispositions"] = [
            row for row in out.get("serviceBindingDispositions", []) if row.get("serviceId") != remove_service
        ]
    dropped_ref = defect.get("dropObservabilityOperationsExecutionEnterpriseEvidenceRef")
    if dropped_ref:
        out["enterpriseEvidenceRefs"] = [
            item for item in out.get("enterpriseEvidenceRefs", []) if item != dropped_ref
        ]
    for patch in defect.get("observabilityOperationsExecutionServicePatch", []):
        row = next(
            (r for r in out.get("serviceBindingDispositions", []) if r.get("serviceId") == patch["serviceId"]),
            None,
        )
        if row is None:
            continue
        for key, value in patch.get("set", {}).items():
            set_nested_value(row, key, value)
        for key in patch.get("drop", []):
            drop_nested_value(row, key)
    return out


def apply_backup_restore_operational_depth_defect(depth: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(depth)
    for key, value in defect.get("backupRestoreOperationalDepthSet", {}).items():
        set_nested_value(out, key, value)
    for key in defect.get("backupRestoreOperationalDepthDrop", []):
        drop_nested_value(out, key)
    remove_boundary = defect.get("removeBackupRestoreOperationalDepthBoundary")
    if remove_boundary:
        out["boundaries"] = [
            row for row in out.get("boundaries", []) if row.get("id") != remove_boundary
        ]
    for patch in defect.get("backupRestoreOperationalDepthBoundaryPatch", []):
        row = next((r for r in out.get("boundaries", []) if r.get("id") == patch["id"]), None)
        if row is None:
            continue
        for key, value in patch.get("set", {}).items():
            set_nested_value(row, key, value)
        for key in patch.get("drop", []):
            drop_nested_value(row, key)
    for patch in defect.get("backupRestoreOperationalDepthDispositionPatch", []):
        row = next(
            (r for r in out.get("dataBearingServiceDispositions", []) if r.get("serviceId") == patch["serviceId"]),
            None,
        )
        if row is None:
            continue
        for key, value in patch.get("set", {}).items():
            set_nested_value(row, key, value)
        for key in patch.get("drop", []):
            drop_nested_value(row, key)
    return out


def apply_generated_client_graphql_delivery_depth_defect(depth: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(depth)
    for key, value in defect.get("generatedClientGraphqlDeliveryDepthSet", {}).items():
        set_nested_value(out, key, value)
    for key in defect.get("generatedClientGraphqlDeliveryDepthDrop", []):
        drop_nested_value(out, key)
    remove_surface = defect.get("removeGeneratedClientGraphqlDeliverySurface")
    if remove_surface:
        out["surfaceDispositions"] = [
            row for row in out.get("surfaceDispositions", []) if row.get("id") != remove_surface
        ]
    for patch in defect.get("generatedClientGraphqlDeliverySurfacePatch", []):
        row = next((r for r in out.get("surfaceDispositions", []) if r.get("id") == patch["id"]), None)
        if row is None:
            continue
        for key, value in patch.get("set", {}).items():
            set_nested_value(row, key, value)
        for key in patch.get("drop", []):
            drop_nested_value(row, key)
    return out


def apply_environment_promotion_defect(promotion: dict[str, Any], defect: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(promotion)
    if defect.get("removePromotionEnvironment"):
        stage = defect["removePromotionEnvironment"]
        out["environmentStandards"] = [
            row for row in out.get("environmentStandards", []) if row.get("environmentStage") != stage
        ]
    if defect.get("removePromotionGate"):
        gate_id = defect["removePromotionGate"]
        out["promotionGates"] = [row for row in out.get("promotionGates", []) if row.get("id") != gate_id]
    for key, value in defect.get("promotionTopSet", {}).items():
        out[key] = value
    if defect.get("promotionDropNonClaims"):
        dropped = set(defect.get("promotionDropNonClaims", []))
        out["nonClaims"] = [item for item in out.get("nonClaims", []) if item not in dropped]
    for patch in defect.get("promotionEnvironmentPatch", []):
        for row in out.get("environmentStandards", []):
            if row.get("environmentStage") != patch.get("environmentStage"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
    for patch in defect.get("promotionGatePatch", []):
        for row in out.get("promotionGates", []):
            if row.get("id") != patch.get("id"):
                continue
            for key in patch.get("drop", []):
                row.pop(key, None)
            for key, value in patch.get("set", {}).items():
                row[key] = value
    return out


def check_shape(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    schema = state["schema"]
    if Draft202012Validator is None:
        F.add(
            "USF-ENTERPRISE-001",
            "tools/validate-spec/requirements.txt",
            "jsonschema dependency unavailable; enterprise schema validation cannot run",
        )
    else:
        errors = list(Draft202012Validator(schema).iter_errors(model))
        for err in errors:
            loc = "/".join(str(item) for item in err.path)
            subject = f"{MODEL_PATH}:{loc}" if loc else str(MODEL_PATH)
            F.add("USF-ENTERPRISE-001", subject, err.message[:180])
    if not isinstance(model, dict):
        F.add("USF-ENTERPRISE-001", str(MODEL_PATH), "model is not an object")
        return
    if model.get("serviceCatalogueAuthority") != str(SERVICE_CATALOGUE_PATH):
        F.add("USF-ENTERPRISE-001", str(MODEL_PATH), "service catalogue authority path is not pinned")


def check_policy_and_non_claims(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    non_claims = set(model.get("nonClaims", []))
    missing = REQUIRED_NON_CLAIMS - non_claims
    if missing:
        F.add("USF-ENTERPRISE-007", str(MODEL_PATH), f"missing non-claims: {sorted(missing)}")
    policy = model.get("policy", {})
    expected_policy = {
        "statementOfApplicabilitySupportOnly": True,
        "implementationRequiresEnterpriseEvidence": True,
        "doneRequiresEvidence": True,
        "validationPassingAloneIsNotDone": True,
        "runtimeImplementationAllowed": False,
    }
    for key, expected in expected_policy.items():
        if policy.get(key) is not expected:
            F.add("USF-ENTERPRISE-007", f"policy.{key}", f"expected {expected!r}")
    done = model.get("doneStateGovernance", {})
    for key in (
        "acceptanceCriteriaRequireEvidence",
        "deferredItemsRequireFollowUp",
        "nonClaimsMustBePreserved",
        "serviceDispositionRowsMustBeResolved",
        "validationPassingAloneIsNotDone",
    ):
        if done.get(key) is not True:
            F.add("USF-ENTERPRISE-007", f"doneStateGovernance.{key}", "must be true")
    if done.get("doneClaimed") is not False:
        F.add("USF-ENTERPRISE-007", "doneStateGovernance.doneClaimed", "this PR must not claim Done")

    lane_rows = {row.get("laneIssue"): row for row in model.get("laneEvidenceRequirements", [])}
    if set(lane_rows) != REQUIRED_LANES:
        F.add("USF-ENTERPRISE-007", "laneEvidenceRequirements", "lane coverage does not match USF-185 through USF-191")
    for lane in APPROVED_LANES:
        row = lane_rows.get(lane, {})
        if row.get("implementationAllowed") is not True:
            F.add("USF-ENTERPRISE-007", lane, "approved lanes must be implementation-allowed")
    for lane in BLOCKED_LANES:
        row = lane_rows.get(lane, {})
        if row.get("implementationAllowed") is not False:
            F.add("USF-ENTERPRISE-007", lane, "lanes 2 through 7 must remain blocked")


def check_soa_coverage(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    service_catalogue = state["serviceCatalogue"]
    runtime_manifest = state["runtimeManifest"]
    package = state["package"]
    soa = rows_by_id(model.get("soaSupportMappings"))
    services = service_catalogue.get("services", [])
    for service in services:
        service_id = service.get("serviceId")
        if f"soa-service-{service_id}" not in soa:
            F.add("USF-ENTERPRISE-002", service_id, "missing service SoA-support mapping")
        if service_deferred_reason(service) != "not-deferred" and f"soa-deferred-boundary-{service_id}" not in soa:
            F.add("USF-ENTERPRISE-002", service_id, "missing deferred-boundary SoA-support mapping")
    for binding in runtime_manifest.get("providerBindingMatrix", []):
        binding_id = binding.get("bindingId")
        if f"soa-adapter-{binding_id}" not in soa:
            F.add("USF-ENTERPRISE-002", binding_id, "missing adapter SoA-support mapping")
    for proof_name in proof_scripts(package):
        if f"soa-proof-{proof_name.replace(':', '-')}" not in soa:
            F.add("USF-ENTERPRISE-002", proof_name, "missing proof SoA-support mapping")
    for validator_id in VALIDATOR_ROWS:
        if f"soa-validator-{validator_id}" not in soa:
            F.add("USF-ENTERPRISE-002", validator_id, "missing validator SoA-support mapping")
    for row in soa.values():
        if REQUIRED_NON_CLAIMS - set(row.get("nonClaims", [])):
            F.add("USF-ENTERPRISE-002", row.get("id", "unknown"), "SoA row non-claims are incomplete")
        if not row.get("validationCommand"):
            F.add("USF-ENTERPRISE-002", row.get("id", "unknown"), "SoA row lacks validation command")


def check_evidence_register(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    package = state["package"]
    evidence = rows_by_id(model.get("evidenceRegister"))
    for proof_name, command in proof_scripts(package).items():
        evidence_id = f"evidence-proof-{proof_name.replace(':', '-')}"
        row = evidence.get(evidence_id)
        if not row:
            F.add("USF-ENTERPRISE-003", evidence_id, "missing proof evidence register row")
            continue
        if row.get("commandPin") != command:
            F.add("USF-ENTERPRISE-003", evidence_id, "command pin does not match package script")
    for required_id in (
        "evidence-lane1-service-disposition-closure-matrix",
        "evidence-enterprise-evidence-model-validator",
    ):
        if required_id not in evidence:
            F.add("USF-ENTERPRISE-003", required_id, "missing required repository evidence row")
    for row in evidence.values():
        subject = row.get("id", "unknown")
        if not SHA_RE.fullmatch(str(row.get("commitPin", ""))):
            F.add("USF-ENTERPRISE-003", subject, "commitPin must be a 40-character git SHA")
        if not SHA_RE.fullmatch(str(row.get("prOrMergeSha", ""))):
            F.add("USF-ENTERPRISE-003", subject, "prOrMergeSha must be a 40-character git SHA")
        if not row.get("validationCommand") or not row.get("commandPin"):
            F.add("USF-ENTERPRISE-003", subject, "validation command and command pin are required")
        issue_links = row.get("issueLinks", [])
        if not isinstance(issue_links, list) or not issue_links or not all(str(item).startswith("USF-") for item in issue_links):
            F.add("USF-ENTERPRISE-003", subject, "issue links must be present and use USF issue ids")


def check_threat_posture(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    runtime_manifest = state["runtimeManifest"]
    threats = rows_by_id(model.get("threatModelAbuseCaseRegister"))
    for binding in runtime_manifest.get("providerBindingMatrix", []):
        binding_id = binding.get("bindingId")
        if f"threat-adapter-{binding_id}" not in threats:
            F.add("USF-ENTERPRISE-004", binding_id, "missing adapter threat model row")
    for lane in REQUIRED_LANES:
        if f"threat-lane-{lane.lower()}" not in threats:
            F.add("USF-ENTERPRISE-004", lane, "missing lane threat model row")
    for row in threats.values():
        subject = row.get("id", "unknown")
        for field in ("abuseCases", "failureModes"):
            if not isinstance(row.get(field), list) or not row[field]:
                F.add("USF-ENTERPRISE-004", subject, f"{field} must be populated")
        if not row.get("failClosedBehaviour") or not row.get("monitoringAuditEvidence"):
            F.add("USF-ENTERPRISE-004", subject, "fail-closed and monitoring/audit evidence are required")
        residual_risk = str(row.get("residualRisk", ""))
        for token in ("owner=", "riskOwner=", "reviewDate="):
            if token not in residual_risk:
                F.add("USF-ENTERPRISE-004", subject, f"residualRisk lacks {token}")
        if not re.search(r"\b(effectivenessState|riskTreatment|treatment)=", residual_risk):
            F.add("USF-ENTERPRISE-004", subject, "residualRisk lacks treatment or effectiveness state")
        if "reviewDate=" in residual_risk and not re.search(r"reviewDate=\d{4}-\d{2}-\d{2}", residual_risk):
            F.add("USF-ENTERPRISE-004", subject, "residualRisk reviewDate must be ISO date shaped")


def check_sdk_governance(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    runtime_manifest = state["runtimeManifest"]
    package = state["package"]
    package_versions = {}
    for section in ("dependencies", "devDependencies"):
        data = package.get(section, {})
        if isinstance(data, dict):
            package_versions.update(data)
    sdk_rows = rows_by_id(model.get("sdkDependencyGovernance"))
    for binding in runtime_manifest.get("providerBindingMatrix", []):
        binding_id = binding.get("bindingId")
        if binding.get("sdkPackage") in {None, ""}:
            continue
        packages = [item.strip() for item in str(binding.get("sdkPackage", "")).split(",") if item.strip()]
        versions = [item.strip() for item in str(binding.get("sdkVersion", "")).split(",") if item.strip()]
        for idx, package_name in enumerate(packages):
            expected_version = versions[idx] if idx < len(versions) else (versions[0] if versions else "")
            row_id = f"sdk-{binding_id}-{package_name.replace('@', 'at-').replace('/', '-')}"
            row = sdk_rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-005", row_id, "missing SDK governance row")
                continue
            if row.get("version") != expected_version:
                F.add("USF-ENTERPRISE-005", row_id, "SDK governance version does not match runtime manifest")
            if not PINNED_VERSION_RE.fullmatch(str(row.get("version", ""))):
                F.add("USF-ENTERPRISE-005", row_id, "SDK version must be exact-pinned")
            package_json_version = package_versions.get(package_name)
            if package_json_version != row.get("version"):
                F.add("USF-ENTERPRISE-005", row_id, "SDK governance version does not match package.json")
            if not PINNED_VERSION_RE.fullmatch(str(package_json_version or "")):
                F.add("USF-ENTERPRISE-005", package_name, "package.json dependency must be exact-pinned")
            for field in (
                "selectionRationale",
                "officialOrDeFactoStatus",
                "licencePosture",
                "maintenancePosture",
                "securityAdvisoryPosture",
                "typescriptRuntimeCompatibility",
                "forbiddenLayerImportCheck",
                "updateDeprecationOwner",
            ):
                if not row.get(field):
                    F.add("USF-ENTERPRISE-005", row_id, f"missing {field}")


def check_observability_standard(F: Findings, state: dict[str, Any]) -> None:
    standard = state["model"].get("observabilityEvidenceStandard", {})
    missing_required = REQUIRED_OBSERVABILITY_FIELDS - set(standard.get("requiredFields", []))
    if missing_required:
        F.add("USF-ENTERPRISE-006", "observabilityEvidenceStandard.requiredFields", f"missing {sorted(missing_required)}")
    missing_prohibited = PROHIBITED_OBSERVABILITY_FIELDS - set(standard.get("prohibitedFields", []))
    if missing_prohibited:
        F.add("USF-ENTERPRISE-006", "observabilityEvidenceStandard.prohibitedFields", f"missing {sorted(missing_prohibited)}")
    for field in ("auditEvidenceRequirement", "tracingEvidenceRequirement", "metricsEvidenceRequirement"):
        if not standard.get(field):
            F.add("USF-ENTERPRISE-006", f"observabilityEvidenceStandard.{field}", "missing evidence requirement")


def check_posture_registers(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    service_catalogue = state["serviceCatalogue"]
    runtime_manifest = state["runtimeManifest"]
    package = state["package"]
    access = rows_by_id(model.get("accessReviewPrivilegedOperationPosture"))
    resilience = rows_by_id(model.get("backupRestoreResiliencePosture"))
    incident = rows_by_id(model.get("incidentVulnerabilityManagementEvidence"))
    privacy = rows_by_id(model.get("privacyDataMinimisationPosture"))
    for service in service_catalogue.get("services", []):
        service_id = service.get("serviceId")
        if service_needs_access_posture(service) and f"access-posture-{service_id}" not in access:
            F.add("USF-ENTERPRISE-009", service_id, "missing access review posture row")
        if service_needs_resilience_posture(service) and f"resilience-posture-{service_id}" not in resilience:
            F.add("USF-ENTERPRISE-009", service_id, "missing backup/restore resilience posture row")
        if f"incident-vulnerability-{service_id}" not in incident:
            F.add("USF-ENTERPRISE-009", service_id, "missing incident/vulnerability posture row")
    for proof_name in proof_scripts(package):
        if f"privacy-proof-{proof_name.replace(':', '-')}" not in privacy:
            F.add("USF-ENTERPRISE-009", proof_name, "missing proof privacy/data minimisation posture row")
    for binding in runtime_manifest.get("providerBindingMatrix", []):
        binding_id = binding.get("bindingId")
        if f"privacy-adapter-{binding_id}" not in privacy:
            F.add("USF-ENTERPRISE-009", binding_id, "missing adapter privacy/data minimisation posture row")


def effectiveness_state(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    prefix = "effectivenessState="
    for part in value.split(";"):
        item = part.strip()
        if item.startswith(prefix):
            return item.removeprefix(prefix)
    return None


def has_placeholder(value: Any) -> bool:
    return not isinstance(value, str) or not value.strip() or PLACEHOLDER_RE.search(value) is not None


def check_lane6_safety_controls(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    soa = rows_by_id(model.get("soaSupportMappings"))
    evidence = rows_by_id(model.get("evidenceRegister"))
    threats = rows_by_id(model.get("threatModelAbuseCaseRegister"))

    for row_id, expected in LANE6_CONTROL_ROWS.items():
        row = soa.get(row_id)
        if not row:
            F.add("USF-ENTERPRISE-011", row_id, "missing Lane 6 safety-control SoA row")
            continue
        state_value = effectiveness_state(row.get("implementationStatus"))
        if state_value not in EFFECTIVENESS_STATES:
            F.add("USF-ENTERPRISE-011", row_id, "effectivenessState is missing or not controlled")
        elif state_value != expected["expectedState"]:
            F.add("USF-ENTERPRISE-011", row_id, f"expected effectivenessState={expected['expectedState']}")
        for field in ("owner", "riskOwner", "controlOwner"):
            if has_placeholder(row.get(field)):
                F.add("USF-ENTERPRISE-011", row_id, f"{field} is missing or placeholder")
        if expected["evidence"] not in str(row.get("evidenceSource", "")):
            F.add("USF-ENTERPRISE-011", row_id, "control-to-evidence graph does not reference its evidence row")
        if expected["followUp"] not in str(row.get("deferredReason", "")):
            F.add("USF-ENTERPRISE-011", row_id, "deferred boundary lacks linked follow-up issue")
        missing_deferral = [token for token in LANE6_DEFERRAL_TOKENS if token not in str(row.get("deferredReason", ""))]
        if missing_deferral:
            F.add("USF-ENTERPRISE-011", row_id, f"deferred boundary lacks {missing_deferral}")
        missing_exception = [token for token in LANE6_EXCEPTION_TOKENS if token not in str(row.get("deferredReason", ""))]
        if missing_exception:
            F.add("USF-ENTERPRISE-011", row_id, f"exception boundary lacks {missing_exception}")
        if REQUIRED_NON_CLAIMS - set(row.get("nonClaims", [])):
            F.add("USF-ENTERPRISE-011", row_id, "Lane 6 control row non-claims are incomplete")

    for evidence_id in LANE6_EVIDENCE_ROWS:
        row = evidence.get(evidence_id)
        if not row:
            F.add("USF-ENTERPRISE-011", evidence_id, "missing Lane 6 evidence register row")
            continue
        if "USF-190" not in row.get("issueLinks", []):
            F.add("USF-ENTERPRISE-011", evidence_id, "Lane 6 evidence row must link USF-190")
        if not row.get("whatWasNotProven") or "No " not in str(row.get("whatWasNotProven")):
            F.add("USF-ENTERPRISE-011", evidence_id, "Lane 6 evidence row must preserve explicit non-claims")

    for threat_id in LANE6_THREAT_ROWS:
        if threat_id not in threats:
            F.add("USF-ENTERPRISE-011", threat_id, "missing Lane 6 threat or abuse-case row")

    for section, required_ids in LANE6_POSTURE_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in required_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-011", row_id, f"missing Lane 6 posture row in {section}")
                continue
            posture_text = ";".join(str(item) for item in row.get("posture", []))
            for token in ("effectivenessState=", "dataClassification=", "changeManagementEvidence=", "rollbackDeferredBoundary="):
                if token not in posture_text:
                    F.add("USF-ENTERPRISE-011", row_id, f"posture row lacks {token}")
            if REQUIRED_NON_CLAIMS - set(row.get("nonClaims", [])):
                F.add("USF-ENTERPRISE-011", row_id, "Lane 6 posture row non-claims are incomplete")

    lane_rows = {row.get("laneIssue"): row for row in model.get("laneEvidenceRequirements", [])}
    lane = lane_rows.get("USF-190", {})
    if str(lane.get("approvalStatus", "")).lower() in {"done", "complete", "completed", "closed"}:
        F.add("USF-ENTERPRISE-011", "USF-190", "Lane 6 must remain open until coordinator confirms acceptance criteria")


def check_closure_matrix_linkage(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("closureMatrix")
    if matrix is None:
        F.add("USF-ENTERPRISE-008", str(CLOSURE_MATRIX_PATH), "Lane 1 closure matrix is missing")
        return
    if matrix.get("enterprise_evidence_model") != str(MODEL_PATH):
        F.add("USF-ENTERPRISE-008", str(CLOSURE_MATRIX_PATH), "closure matrix lacks enterprise evidence model link")
    if matrix.get("closure_claimed") is not False:
        F.add("USF-ENTERPRISE-007", str(CLOSURE_MATRIX_PATH), "closure matrix must not claim closure while unresolved rows remain")
    unresolved = []
    for row in matrix.get("rows", []):
        evidence = row.get("closure_evidence", {}) if isinstance(row, dict) else {}
        service_id = row.get("service_id", "unknown") if isinstance(row, dict) else "unknown"
        refs = evidence.get("enterprise_evidence_refs")
        if not isinstance(refs, list) or not refs:
            F.add("USF-ENTERPRISE-008", service_id, "closure row lacks enterprise evidence refs")
        disposition = evidence.get("closure_disposition")
        if evidence.get("closure_blocking") is True:
            unresolved.append(service_id)
            issues = evidence.get("tracking_issues", [])
            if not isinstance(issues, list) or not any(str(issue).startswith("USF-") for issue in issues):
                F.add("USF-ENTERPRISE-007", service_id, "blocking closure row lacks follow-up issue link")
        if disposition in {"deferred", "requires-human-decision", "substituted-partial"} and evidence.get("closure_blocking") is not True:
            F.add("USF-ENTERPRISE-007", service_id, "unresolved disposition must remain closure-blocking")
    if unresolved and matrix.get("closure_claimed") is True:
        F.add("USF-ENTERPRISE-007", str(CLOSURE_MATRIX_PATH), f"closure claimed with unresolved rows: {unresolved[:8]}")


def check_operator_access_gateway_matrix(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("operatorAccessMatrix")
    if not isinstance(matrix, dict):
        F.add("USF-ENTERPRISE-014", str(OPERATOR_ACCESS_MATRIX_PATH), "operator access gateway posture matrix is missing")
        return

    services = {
        service.get("serviceId"): service
        for service in state["serviceCatalogue"].get("services", [])
        if isinstance(service, dict) and isinstance(service.get("serviceId"), str)
    }
    expected_services = {
        service_id for service_id, service in services.items() if service_needs_operator_access_decision(service)
    }
    declared_services = set(matrix.get("requiredServiceIds", []))
    if declared_services != expected_services:
        missing = sorted(expected_services - declared_services)
        extra = sorted(declared_services - expected_services)
        F.add("USF-ENTERPRISE-014", "requiredServiceIds", f"missing={missing} extra={extra}")

    if matrix.get("serviceCatalogueAuthority") != str(SERVICE_CATALOGUE_PATH):
        F.add("USF-ENTERPRISE-014", "serviceCatalogueAuthority", "matrix must pin service catalogue authority")
    if matrix.get("enterpriseEvidenceModel") != str(MODEL_PATH):
        F.add("USF-ENTERPRISE-014", "enterpriseEvidenceModel", "matrix must pin enterprise evidence model")
    if matrix.get("validationCommand") != "python3 tools/validate-enterprise/validate-enterprise.py all --json":
        F.add("USF-ENTERPRISE-014", "validationCommand", "matrix validation command must be command-pinned")
    if REQUIRED_NON_CLAIMS - set(matrix.get("nonClaims", [])):
        F.add("USF-ENTERPRISE-014", "nonClaims", "matrix non-claims are incomplete")
    if set(matrix.get("effectivenessStatesAllowed", [])) != EFFECTIVENESS_STATES:
        F.add("USF-ENTERPRISE-014", "effectivenessStatesAllowed", "effectiveness state set is incomplete")
    if REQUIRED_NON_CLAIMS & set(matrix.get("readinessClaimsAllowed", [])):
        F.add("USF-ENTERPRISE-014", "readinessClaimsAllowed", "matrix allows a prohibited readiness claim")
    if REQUIRED_NON_CLAIMS - set(matrix.get("readinessClaimsProhibited", [])):
        F.add("USF-ENTERPRISE-014", "readinessClaimsProhibited", "matrix prohibited readiness claims are incomplete")
    for field in (
        "adminSurfaceExposurePolicy",
        "authnAuthzPosture",
        "tenantBoundary",
        "secretBoundary",
        "clickthroughBoundary",
        "proofPosture",
    ):
        if not matrix.get(field):
            F.add("USF-ENTERPRISE-014", field, "matrix boundary field is required")

    gateway = matrix.get("gatewayBoundary", {})
    if not isinstance(gateway, dict):
        F.add("USF-ENTERPRISE-014", "gatewayBoundary", "gateway boundary must be an object")
    else:
        expected_gateway = {
            "gatewayServiceId": "caddy",
            "defaultExposure": "loopback-only",
            "directPublicExposureClaim": False,
            "directLanExposureClaim": False,
            "clickthroughUiImplementationPresent": False,
            "uiImplementationCreated": False,
        }
        for key, expected in expected_gateway.items():
            observed = gateway.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-ENTERPRISE-014", f"gatewayBoundary.{key}", f"expected {expected!r}")
        if not gateway.get("authnAuthzPosture") or not gateway.get("auditPosture"):
            F.add("USF-ENTERPRISE-014", "gatewayBoundary", "gateway authn/authz and audit posture are required")

    change = matrix.get("changeManagementEvidence", {})
    if not isinstance(change, dict) or any(
        not change.get(field) for field in ("changeRecord", "validation", "rollbackBoundary", "deferredBoundary")
    ):
        F.add("USF-ENTERPRISE-014", "changeManagementEvidence", "change, validation, rollback, and deferred boundaries are required")
    if not matrix.get("controlEvidenceRefs"):
        F.add("USF-ENTERPRISE-014", "controlEvidenceRefs", "control/evidence references are required")
    for exception in matrix.get("exceptions", []):
        if not isinstance(exception, dict):
            F.add("USF-ENTERPRISE-014", "exceptions", "exception entries must be objects")
            continue
        for field in ("owner", "reason", "compensatingControl", "expiry", "validationCommand", "followUpIssue"):
            if not exception.get(field):
                F.add("USF-ENTERPRISE-014", exception.get("id", "exception"), f"missing exception {field}")

    rows = matrix.get("rows", [])
    if not isinstance(rows, list):
        F.add("USF-ENTERPRISE-014", "rows", "matrix rows must be a list")
        return
    row_services = {row.get("serviceId"): row for row in rows if isinstance(row, dict)}
    if set(row_services) != expected_services:
        F.add(
            "USF-ENTERPRISE-014",
            "rows",
            f"missing={sorted(expected_services - set(row_services))} extra={sorted(set(row_services) - expected_services)}",
        )

    row_ids: set[str] = set()
    for row in rows:
        if not isinstance(row, dict):
            F.add("USF-ENTERPRISE-014", "rows", "row must be an object")
            continue
        row_id = str(row.get("id", ""))
        service_id = row.get("serviceId")
        service = services.get(service_id)
        if row_id in row_ids:
            F.add("USF-ENTERPRISE-014", row_id, "duplicate matrix row id")
        row_ids.add(row_id)
        if not row_id.startswith("usf-186-"):
            F.add("USF-ENTERPRISE-014", row_id or service_id or "row", "row id must use usf-186 prefix")
        if service is None:
            F.add("USF-ENTERPRISE-014", service_id or row_id, "row references unknown service")
            continue

        for field in (
            "surfaceKind",
            "effectivenessState",
            "accessModel",
            "authRequirement",
            "auditRequirement",
            "accessReviewOwner",
            "riskOwner",
            "controlOwner",
            "breakGlassRelevance",
            "defaultBindScope",
            "localHostPublication",
            "deferredRisk",
        ):
            if row.get(field) in (None, "", []):
                F.add("USF-ENTERPRISE-014", row_id, f"missing {field}")
        if row.get("effectivenessState") not in EFFECTIVENESS_STATES:
            F.add("USF-ENTERPRISE-014", row_id, "unknown effectiveness state")
        if row.get("publicExposureAllowed") is not False:
            F.add("USF-ENTERPRISE-014", row_id, "public exposure must remain denied")
        if row.get("lanExposureAllowed") is not False:
            F.add("USF-ENTERPRISE-014", row_id, "LAN exposure must remain denied")
        if row.get("accessModel") != service.get("accessModel"):
            F.add("USF-ENTERPRISE-014", row_id, "access model does not match service catalogue")
        if row.get("authRequirement") != service.get("authRequirement"):
            F.add("USF-ENTERPRISE-014", row_id, "auth requirement does not match service catalogue")
        if row.get("auditRequirement") != service.get("auditRequirement"):
            F.add("USF-ENTERPRISE-014", row_id, "audit requirement does not match service catalogue")
        if row.get("breakGlassRelevance") != service.get("breakGlassRelevance"):
            F.add("USF-ENTERPRISE-014", row_id, "break-glass relevance does not match service catalogue")
        if row.get("accessReviewOwner") != service.get("serviceOwner"):
            F.add("USF-ENTERPRISE-014", row_id, "access review owner does not match service owner")
        if row.get("riskOwner") != service.get("riskOwner") or row.get("controlOwner") != service.get("controlOwner"):
            F.add("USF-ENTERPRISE-014", row_id, "risk or control owner does not match service catalogue")

        publication = local_publication(service)
        expected_bind = (
            "external-provider-managed"
            if publication == "not-host-published" and service.get("accessModel") == "external-provider-console"
            else publication
        )
        if publication == "non-loopback-present":
            F.add("USF-ENTERPRISE-014", service_id, "service catalogue contains non-loopback or exposed port")
        if row.get("defaultBindScope") != expected_bind:
            F.add("USF-ENTERPRISE-014", row_id, "default bind scope does not match catalogue exposure")
        if row.get("localHostPublication") != publication:
            F.add("USF-ENTERPRISE-014", row_id, "local host publication does not match service ports")
        for port in service.get("ports", []) or []:
            if (
                port.get("hostIp") != "127.0.0.1"
                or port.get("bindScope") != "loopback-only"
                or port.get("internetExposureAllowed") is not False
            ):
                F.add("USF-ENTERPRISE-014", f"{service_id}:{port.get('portId')}", "operator/gateway port is not loopback-only")

        human_surface = (
            service.get("adminSurface", {}).get("present") is True
            or service.get("operatorSurface", {}).get("present") is True
            or service.get("accessModel") in {"operator-access", "admin-only", "external-provider-console"}
            or service.get("serviceKind") == "gateway"
        )
        if human_surface and row.get("authRequirement") not in OPERATOR_AUTH_REQUIREMENTS:
            F.add("USF-ENTERPRISE-014", row_id, "operator/admin/gateway surface lacks required auth posture")
        if human_surface and row.get("auditRequirement") != "operator-action-audit-required":
            F.add("USF-ENTERPRISE-014", row_id, "operator/admin/gateway surface lacks operator audit posture")
        if row.get("surfaceKind") == "control-plane-no-human-access" and row.get("accessModel") != "no-human-access":
            F.add("USF-ENTERPRISE-014", row_id, "no-human control-plane row must not permit human access")
        if service_id == "caddy":
            if row.get("surfaceKind") != "gateway":
                F.add("USF-ENTERPRISE-014", row_id, "caddy row must be the gateway row")
            source_refs = set(row.get("sourceRefs", []))
            if "../react/docker/caddy/Caddyfile" not in source_refs:
                F.add("USF-ENTERPRISE-014", row_id, "gateway row lacks React gateway lineage reference")

        risk = row.get("deferredRisk", {})
        if not isinstance(risk, dict):
            F.add("USF-ENTERPRISE-014", row_id, "deferred risk must be an object")
            continue
        for field in (
            "riskStatement",
            "threatFailureScenario",
            "affectedAssetService",
            "impact",
            "likelihood",
            "owner",
            "treatment",
            "reviewDate",
            "linkedFollowUpIssue",
        ):
            if not risk.get(field):
                F.add("USF-ENTERPRISE-014", row_id, f"missing deferred risk {field}")
        if risk.get("affectedAssetService") != service_id:
            F.add("USF-ENTERPRISE-014", row_id, "deferred risk affected service does not match row")
        if risk.get("owner") != row.get("accessReviewOwner"):
            F.add("USF-ENTERPRISE-014", row_id, "deferred risk owner must match access review owner")
        if not DATE_RE.fullmatch(str(risk.get("reviewDate", ""))):
            F.add("USF-ENTERPRISE-014", row_id, "deferred risk review date must be YYYY-MM-DD")
        if not str(risk.get("linkedFollowUpIssue", "")).startswith("USF-"):
            F.add("USF-ENTERPRISE-014", row_id, "deferred risk follow-up issue must be linked")


def check_operator_access_review_deprovisioning_depth(F: Findings, state: dict[str, Any]) -> None:
    depth = state.get("operatorAccessReviewDepth")
    operator_matrix = state.get("operatorAccessMatrix")
    if not isinstance(depth, dict):
        F.add("USF-ENTERPRISE-025", str(OPERATOR_ACCESS_REVIEW_DEPTH_PATH), "USF-217 depth artefact is missing")
        return
    if not isinstance(operator_matrix, dict):
        F.add("USF-ENTERPRISE-025", str(OPERATOR_ACCESS_MATRIX_PATH), "operator access matrix is required")
        return

    services = {
        service.get("serviceId"): service
        for service in state["serviceCatalogue"].get("services", [])
        if isinstance(service, dict) and isinstance(service.get("serviceId"), str)
    }
    expected_services = {
        service_id for service_id, service in services.items() if service_needs_operator_access_decision(service)
    }
    declared_services = set(depth.get("requiredServiceIds", []))
    if declared_services != expected_services:
        F.add(
            "USF-ENTERPRISE-025",
            "requiredServiceIds",
            f"missing={sorted(expected_services - declared_services)} extra={sorted(declared_services - expected_services)}",
        )
    if depth.get("issueId") != "USF-217" or depth.get("followUpIssueId") != "USF-221":
        F.add("USF-ENTERPRISE-025", "issueLinks", "USF-217 and USF-221 linkage is required")
    if depth.get("serviceCatalogueAuthority") != str(SERVICE_CATALOGUE_PATH):
        F.add("USF-ENTERPRISE-025", "serviceCatalogueAuthority", "service catalogue authority must be pinned")
    if depth.get("operatorAccessMatrix") != str(OPERATOR_ACCESS_MATRIX_PATH):
        F.add("USF-ENTERPRISE-025", "operatorAccessMatrix", "operator access matrix path must be pinned")
    if depth.get("enterpriseEvidenceModel") != str(MODEL_PATH):
        F.add("USF-ENTERPRISE-025", "enterpriseEvidenceModel", "enterprise evidence model path must be pinned")
    if depth.get("validationCommand") != "python3 tools/validate-enterprise/validate-enterprise.py all --json":
        F.add("USF-ENTERPRISE-025", "validationCommand", "validator command must be pinned")
    if REQUIRED_NON_CLAIMS - set(depth.get("nonClaims", [])):
        F.add("USF-ENTERPRISE-025", "nonClaims", "depth artefact non-claims are incomplete")
    if REQUIRED_NON_CLAIMS & set(depth.get("readinessClaimsAllowed", [])):
        F.add("USF-ENTERPRISE-025", "readinessClaimsAllowed", "depth artefact allows a prohibited claim")
    for field in ("accessReviewExecutionClaim", "deprovisioningExecutionClaim", "publicExposureClaim", "runtimeConsoleReadinessClaim"):
        if depth.get(field) is not False:
            F.add("USF-ENTERPRISE-025", field, "claim must remain false")

    rows = depth.get("rows", [])
    if not isinstance(rows, list):
        F.add("USF-ENTERPRISE-025", "rows", "depth rows must be a list")
        return
    rows_by_service = {row.get("serviceId"): row for row in rows if isinstance(row, dict)}
    if set(rows_by_service) != expected_services:
        F.add(
            "USF-ENTERPRISE-025",
            "rows",
            f"missing={sorted(expected_services - set(rows_by_service))} extra={sorted(set(rows_by_service) - expected_services)}",
        )

    operator_rows = {
        row.get("serviceId"): row for row in operator_matrix.get("rows", []) if isinstance(row, dict)
    }
    access_posture_rows = {
        row.get("target"): row
        for row in state["model"].get("accessReviewPrivilegedOperationPosture", [])
        if isinstance(row, dict) and row.get("targetType") == "service"
    }
    for service_id in sorted(expected_services):
        row = rows_by_service.get(service_id)
        operator_row = operator_rows.get(service_id, {})
        enterprise_row = access_posture_rows.get(service_id)
        if not isinstance(row, dict):
            continue
        row_id = str(row.get("id", ""))
        if not row_id.startswith("usf-217-"):
            F.add("USF-ENTERPRISE-025", row_id or service_id, "row id must use usf-217 prefix")
        if row.get("sourceMatrixRowId") != operator_row.get("id"):
            F.add("USF-ENTERPRISE-025", row_id, "source matrix row linkage is stale")
        if row.get("closureTierDisposition") != "explicitly-deferred-with-owner":
            F.add("USF-ENTERPRISE-025", row_id, "closure tier disposition must be explicit deferral")
        if row.get("publicExposureAllowed") is not False or row.get("lanExposureAllowed") is not False:
            F.add("USF-ENTERPRISE-025", row_id, "public and LAN exposure must remain denied")
        for field in ("accessModel", "authRequirement", "auditRequirement", "breakGlassRelevance"):
            if row.get(field) != operator_row.get(field):
                F.add("USF-ENTERPRISE-025", row_id, f"{field} does not match operator matrix")
        for field in ("owner", "riskOwner", "controlOwner"):
            expected = operator_row.get("accessReviewOwner") if field == "owner" else operator_row.get(field)
            if row.get(field) != expected:
                F.add("USF-ENTERPRISE-025", row_id, f"{field} does not match operator matrix")
        for posture_field in ("accessReviewCadence", "deprovisioningPosture"):
            posture = row.get(posture_field)
            if not isinstance(posture, dict):
                F.add("USF-ENTERPRISE-025", row_id, f"{posture_field} must be an object")
                continue
            expected_values = {
                "status": "deferred-to-USF-221",
                "followUpIssue": "USF-221",
                "owner": row.get("owner"),
                "riskOwner": row.get("riskOwner"),
                "controlOwner": row.get("controlOwner"),
            }
            for key, expected in expected_values.items():
                if posture.get(key) != expected:
                    F.add("USF-ENTERPRISE-025", f"{row_id}.{posture_field}.{key}", f"expected {expected!r}")
            if not DATE_RE.fullmatch(str(posture.get("reviewDate", ""))):
                F.add("USF-ENTERPRISE-025", f"{row_id}.{posture_field}.reviewDate", "review date must be YYYY-MM-DD")
            if not posture.get("currentEvidence") or not posture.get("requiredBeforeClaims"):
                F.add("USF-ENTERPRISE-025", f"{row_id}.{posture_field}", "current evidence and claim boundary are required")
        proof = row.get("proofEvidence", {})
        if not isinstance(proof, dict):
            F.add("USF-ENTERPRISE-025", row_id, "proof evidence boundary must be an object")
        else:
            for field in ("accessReviewExecutionProven", "deprovisioningExecutionProven", "consoleLoginProofProven", "clickthroughProofProven"):
                if proof.get(field) is not False:
                    F.add("USF-ENTERPRISE-025", f"{row_id}.proofEvidence.{field}", "proof must not be overclaimed")
            if not proof.get("nonEquivalenceBoundary"):
                F.add("USF-ENTERPRISE-025", f"{row_id}.proofEvidence", "non-equivalence boundary is required")
        if REQUIRED_NON_CLAIMS - set(row.get("nonClaims", [])):
            F.add("USF-ENTERPRISE-025", row_id, "row non-claims are incomplete")

        for matrix_field, expected in (
            ("accessReviewExecutionClaim", False),
            ("deprovisioningExecutionClaim", False),
            ("runtimeConsoleReadinessClaim", False),
        ):
            if operator_row.get(matrix_field) is not expected:
                F.add("USF-ENTERPRISE-025", f"{operator_row.get('id', service_id)}.{matrix_field}", "operator matrix claim must remain false")
        if operator_row.get("accessReviewCadence", {}).get("followUpIssue") != "USF-221":
            F.add("USF-ENTERPRISE-025", operator_row.get("id", service_id), "operator matrix access review follow-up must be USF-221")
        if operator_row.get("deprovisioningPosture", {}).get("followUpIssue") != "USF-221":
            F.add("USF-ENTERPRISE-025", operator_row.get("id", service_id), "operator matrix deprovisioning follow-up must be USF-221")

        if not isinstance(enterprise_row, dict):
            F.add("USF-ENTERPRISE-025", service_id, "enterprise access posture row is missing")
            continue
        enterprise_text = json.dumps(enterprise_row, sort_keys=True)
        if "TODO-before-readiness-claim" in enterprise_text:
            F.add("USF-ENTERPRISE-025", enterprise_row.get("id", service_id), "TODO access posture placeholder remains")
        for token in (
            "sourceIssue=USF-217",
            "reviewCadence=deferred-to-USF-221-before-any-readiness-claim",
            "deprovisioningPosture=deferred-to-USF-221-before-any-readiness-claim",
            "accessReviewExecutionEvidence=not-proven",
            "deprovisioningExecutionEvidence=not-proven",
            "followUpIssue=USF-221",
        ):
            if token not in enterprise_text:
                F.add("USF-ENTERPRISE-025", enterprise_row.get("id", service_id), f"missing enterprise posture token {token}")
        if REQUIRED_NON_CLAIMS - set(enterprise_row.get("nonClaims", [])):
            F.add("USF-ENTERPRISE-025", enterprise_row.get("id", service_id), "enterprise row non-claims are incomplete")


def check_operator_access_lifecycle_execution_proof(F: Findings, state: dict[str, Any]) -> None:
    proof = state.get("operatorAccessLifecycleProof")
    operator_matrix = state.get("operatorAccessMatrix")
    depth = state.get("operatorAccessReviewDepth")
    if not isinstance(proof, dict):
        F.add("USF-ENTERPRISE-029", str(OPERATOR_ACCESS_LIFECYCLE_PROOF_PATH), "USF-221 proof artefact is missing")
        return
    if not isinstance(operator_matrix, dict) or not isinstance(depth, dict):
        F.add("USF-ENTERPRISE-029", str(OPERATOR_ACCESS_LIFECYCLE_PROOF_PATH), "USF-217 and operator matrix inputs are required")
        return

    expected_top = {
        "sourceIssue": "USF-221",
        "predecessorIssue": "USF-217",
        "parentIssue": "USF-133",
        "dashboardIssue": "USF-184",
        "coordinatorIssue": "USF-192",
        "status": "bounded-local-execution-proof-recorded",
        "serviceCatalogueAuthority": str(SERVICE_CATALOGUE_PATH),
        "operatorAccessMatrix": str(OPERATOR_ACCESS_MATRIX_PATH),
        "predecessorDepthMatrix": str(OPERATOR_ACCESS_REVIEW_DEPTH_PATH),
        "enterpriseEvidenceModel": str(MODEL_PATH),
        "proofPath": str(OPERATOR_ACCESS_LIFECYCLE_PROOF_SOURCE_PATH),
        "proofCommand": "corepack pnpm proof:operator-lifecycle",
        "packageScript": "proof:operator-lifecycle",
        "makeTarget": "operator-lifecycle-proof",
    }
    for key, expected in expected_top.items():
        if proof.get(key) != expected:
            F.add("USF-ENTERPRISE-029", key, f"expected {expected!r}")
    for field in ("owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate"):
        if not proof.get(field):
            F.add("USF-ENTERPRISE-029", field, f"missing {field}")
    if not DATE_RE.fullmatch(str(proof.get("reviewDate", ""))):
        F.add("USF-ENTERPRISE-029", "reviewDate", "review date must be YYYY-MM-DD")

    issue_links = set(proof.get("issueLinks", []))
    missing_issues = OPERATOR_ACCESS_LIFECYCLE_REQUIRED_ISSUES - issue_links
    if missing_issues:
        F.add("USF-ENTERPRISE-029", "issueLinks", f"missing issue links: {sorted(missing_issues)}")
    validation_commands = set(proof.get("validationCommands", []))
    for command in (
        "corepack pnpm proof:operator-lifecycle",
        "python3 tools/validate-enterprise/validate-enterprise.py all --json",
        "corepack pnpm verify",
    ):
        if command not in validation_commands:
            F.add("USF-ENTERPRISE-029", "validationCommands", f"missing {command}")
    missing_non_claims = OPERATOR_ACCESS_LIFECYCLE_PROHIBITED_CLAIMS - {
        str(item).lower() for item in proof.get("nonClaims", [])
    }
    if missing_non_claims:
        F.add("USF-ENTERPRISE-029", "nonClaims", f"missing non-claims: {sorted(missing_non_claims)}")

    required_enterprise_refs = {
        row_id
        for row_ids in OPERATOR_ACCESS_LIFECYCLE_REQUIRED_EVIDENCE_ROWS.values()
        for row_id in row_ids
    }
    refs = set(proof.get("enterpriseEvidenceRefs", []))
    if refs != required_enterprise_refs:
        F.add(
            "USF-ENTERPRISE-029",
            "enterpriseEvidenceRefs",
            f"missing={sorted(required_enterprise_refs - refs)} extra={sorted(refs - required_enterprise_refs)}",
        )

    claims = proof.get("claims", {})
    if not isinstance(claims, dict):
        F.add("USF-ENTERPRISE-029", "claims", "claims must be an object")
        claims = {}
    for field in (
        "boundedLocalAccessReviewWorkflowExecuted",
        "boundedLocalDeprovisioningWorkflowExecuted",
        "revokedMembershipFailClosedBehaviourProven",
        "valueFreeAuditEvidenceCaptured",
    ):
        if claims.get(field) is not True:
            F.add("USF-ENTERPRISE-029", f"claims.{field}", "bounded local proof claim must be true")
    for field in (
        "providerConsoleDeprovisioningClaim",
        "identityProviderLifecycleIntegrationClaim",
        "publicExposureClaim",
        "operatorConsoleReadinessClaim",
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
        if claims.get(field) is not False:
            F.add("USF-ENTERPRISE-029", f"claims.{field}", "readiness or certification claim must remain false")

    semantics = proof.get("executionSemantics", {})
    if not isinstance(semantics, dict):
        F.add("USF-ENTERPRISE-029", "executionSemantics", "execution semantics must be an object")
        semantics = {}
    if semantics.get("runtimeMode") != "hermetic-local-proof":
        F.add("USF-ENTERPRISE-029", "executionSemantics.runtimeMode", "runtime mode must remain hermetic-local-proof")
    if semantics.get("providerMode") != "hermetic-mock":
        F.add("USF-ENTERPRISE-029", "executionSemantics.providerMode", "provider mode must remain hermetic-mock")
    semantics_text = json.dumps(semantics, sort_keys=True).lower()
    for token in (
        "synthetic",
        "security-admin",
        "tenant-admin denial",
        "cross-tenant denial",
        "revoked",
        "audit",
        "hash-chain",
        "raw endpoints",
        "tokens",
        "credentials",
        "stack traces",
    ):
        if token not in semantics_text:
            F.add("USF-ENTERPRISE-029", "executionSemantics", f"missing semantic proof token {token}")

    services = {
        service.get("serviceId"): service
        for service in state["serviceCatalogue"].get("services", [])
        if isinstance(service, dict) and isinstance(service.get("serviceId"), str)
    }
    expected_services = {
        service_id for service_id, service in services.items() if service_needs_operator_access_decision(service)
    }
    operator_rows = {
        row.get("serviceId"): row for row in operator_matrix.get("rows", []) if isinstance(row, dict)
    }
    depth_rows = {row.get("serviceId"): row for row in depth.get("rows", []) if isinstance(row, dict)}
    execution_rows = {
        row.get("serviceId"): row
        for row in proof.get("serviceExecutionRows", [])
        if isinstance(row, dict) and isinstance(row.get("serviceId"), str)
    }
    if set(execution_rows) != expected_services:
        F.add(
            "USF-ENTERPRISE-029",
            "serviceExecutionRows",
            f"missing={sorted(expected_services - set(execution_rows))} extra={sorted(set(execution_rows) - expected_services)}",
        )

    for service_id in sorted(expected_services):
        row = execution_rows.get(service_id)
        operator_row = operator_rows.get(service_id, {})
        depth_row = depth_rows.get(service_id, {})
        if not isinstance(row, dict):
            continue
        subject = f"serviceExecutionRows.{service_id}"
        if row.get("matrixRowId") != operator_row.get("id"):
            F.add("USF-ENTERPRISE-029", subject, "operator matrix row linkage is stale")
        if row.get("serviceCatalogueRow") != f"{SERVICE_CATALOGUE_PATH}#{service_id}":
            F.add("USF-ENTERPRISE-029", subject, "service catalogue row linkage is stale")
        if row.get("status") != "proven-local":
            F.add("USF-ENTERPRISE-029", subject, "status must be proven-local")
        for field in ("owner", "riskOwner", "controlOwner"):
            expected = operator_row.get("accessReviewOwner") if field == "owner" else operator_row.get(field)
            if row.get(field) != expected:
                F.add("USF-ENTERPRISE-029", f"{subject}.{field}", "owner metadata must match operator matrix")
        if depth_row.get("accessReviewCadence", {}).get("followUpIssue") != "USF-221":
            F.add("USF-ENTERPRISE-029", subject, "USF-217 access-review handoff is missing")
        if depth_row.get("deprovisioningPosture", {}).get("followUpIssue") != "USF-221":
            F.add("USF-ENTERPRISE-029", subject, "USF-217 deprovisioning handoff is missing")
        if "corepack pnpm proof:operator-lifecycle" not in str(row.get("accessReviewWorkflowEvidence", "")):
            F.add("USF-ENTERPRISE-029", subject, "access-review workflow proof command is missing")
        if "corepack pnpm proof:operator-lifecycle" not in str(row.get("deprovisioningWorkflowEvidence", "")):
            F.add("USF-ENTERPRISE-029", subject, "deprovisioning workflow proof command is missing")
        if row.get("providerConsoleIntegrationStatus") != "not-proven":
            F.add("USF-ENTERPRISE-029", subject, "provider-console integration must remain not-proven")
        if row.get("publicExposureClaim") is not False or row.get("operatorConsoleReadinessClaim") is not False:
            F.add("USF-ENTERPRISE-029", subject, "public exposure and operator-console readiness claims must be false")
        boundary = str(row.get("nonEquivalenceBoundary", "")).lower()
        for token in ("provider-console", "external idp", "public gateway", "environment promotion", "production operator readiness"):
            if token not in boundary:
                F.add("USF-ENTERPRISE-029", subject, f"non-equivalence boundary lacks {token}")

    boundaries = {
        row.get("id"): row
        for row in proof.get("remainingBoundaries", [])
        if isinstance(row, dict) and isinstance(row.get("id"), str)
    }
    for boundary_id in ("provider-console-sso-and-clickthrough", "external-idp-provider-lifecycle-integration"):
        boundary = boundaries.get(boundary_id)
        if not isinstance(boundary, dict):
            F.add("USF-ENTERPRISE-029", boundary_id, "remaining boundary is missing")
            continue
        for field in ("owner", "riskOwner", "controlOwner", "riskTreatment", "followUpIssues", "reviewDate", "promotionImpact", "nonClaimBoundary"):
            if not boundary.get(field):
                F.add("USF-ENTERPRISE-029", boundary_id, f"missing {field}")
        if boundary.get("status") != "deferred-with-owner":
            F.add("USF-ENTERPRISE-029", boundary_id, "remaining boundary must be deferred-with-owner")
        if not DATE_RE.fullmatch(str(boundary.get("reviewDate", ""))):
            F.add("USF-ENTERPRISE-029", boundary_id, "review date must be YYYY-MM-DD")
        if not all(str(issue).startswith("USF-") for issue in boundary.get("followUpIssues", [])):
            F.add("USF-ENTERPRISE-029", boundary_id, "follow-up issues must be USF issue refs")

    package = state.get("package")
    scripts = package.get("scripts", {}) if isinstance(package, dict) else {}
    if scripts.get("proof:operator-lifecycle") != "tsx packages/proof/src/operator-access-lifecycle-proof.ts":
        F.add("USF-ENTERPRISE-029", "package.scripts.proof:operator-lifecycle", "proof script is missing or stale")
    if "proof:operator-lifecycle" not in str(scripts.get("verify", "")):
        F.add("USF-ENTERPRISE-029", "package.scripts.verify", "verify must run the USF-221 proof")
    if "\noperator-lifecycle-proof:" not in f"\n{state['makefile']}":
        F.add("USF-ENTERPRISE-029", "Makefile#operator-lifecycle-proof", "Make target is missing")

    proof_text = state.get("operatorAccessLifecycleProofText")
    if not isinstance(proof_text, str):
        F.add("USF-ENTERPRISE-029", str(OPERATOR_ACCESS_LIFECYCLE_PROOF_SOURCE_PATH), "proof source text is missing")
    else:
        for marker in (
            "runOperatorAccessLifecycleProof",
            "USF-221",
            "USF-133",
            "provider.readiness.read",
            "tenant.members.delete",
            "revokedMembershipFailsClosed",
            "providerConsoleIntegrationClaim: false",
            "operatorConsoleReadinessClaim: false",
            "FORBIDDEN_SAFE_OUTPUT_RE",
            "auditChainVerified",
        ):
            if marker not in proof_text:
                F.add("USF-ENTERPRISE-029", str(OPERATOR_ACCESS_LIFECYCLE_PROOF_SOURCE_PATH), f"proof source lacks {marker}")
        compact = proof_text.lower().replace(" ", "")
        for prohibited in (
            "providerconsoleintegrationclaim:true",
            "publicexposureclaim:true",
            "operatorconsolereadinessclaim:true",
            "productionreadinessclaim:true",
            "liveproviderreadinessclaim:true",
            "usf133closureclaim:true",
        ):
            if prohibited in compact:
                F.add("USF-ENTERPRISE-029", str(OPERATOR_ACCESS_LIFECYCLE_PROOF_SOURCE_PATH), "proof source overclaims readiness")

    model = state["model"]
    for section, required_ids in OPERATOR_ACCESS_LIFECYCLE_REQUIRED_EVIDENCE_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in required_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-029", row_id, f"missing USF-221 enterprise row in {section}")
                continue
            row_text = json.dumps(row, sort_keys=True)
            row_text_lower = row_text.lower()
            expected_link = (
                str(OPERATOR_ACCESS_LIFECYCLE_PROOF_SOURCE_PATH)
                if section == "evidenceRegister"
                else str(OPERATOR_ACCESS_LIFECYCLE_PROOF_PATH)
            )
            if "USF-221" not in row_text or expected_link not in row_text:
                F.add("USF-ENTERPRISE-029", row_id, "enterprise row lacks USF-221 or proof linkage")
            if "USF-133" not in row_text:
                F.add("USF-ENTERPRISE-029", row_id, "enterprise row lacks USF-133 linkage")
            if section != "threatModelAbuseCaseRegister" and not row.get("validationCommand"):
                F.add("USF-ENTERPRISE-029", row_id, "enterprise row lacks validation command")
            if missing_required_non_claims(row):
                F.add("USF-ENTERPRISE-029", row_id, "enterprise row base non-claims are incomplete")
            for claim in OPERATOR_ACCESS_LIFECYCLE_PROHIBITED_CLAIMS:
                if claim not in row_text_lower and claim.replace("-", " ") not in row_text_lower:
                    F.add("USF-ENTERPRISE-029", row_id, f"enterprise row lacks non-claim or boundary for {claim}")
            if section == "evidenceRegister":
                for issue in OPERATOR_ACCESS_LIFECYCLE_REQUIRED_ISSUES:
                    if issue not in row.get("issueLinks", []):
                        F.add("USF-ENTERPRISE-029", row_id, f"evidence row lacks {issue}")
                negative = str(row.get("whatWasNotProven", "")).lower()
                if "does not prove" not in negative and "not prove" not in negative:
                    F.add("USF-ENTERPRISE-029", row_id, "evidence row must preserve explicit non-proof boundary")

    source_text = json.dumps(proof, sort_keys=True).lower()
    for phrase in (
        "operator console readiness is proven",
        "public operator exposure is proven",
        "provider console readiness is proven",
        "identity provider lifecycle readiness is proven",
        "production readiness is proven",
        "live provider readiness is proven",
        "usf-133 closure is proven",
        "iso certification is proven",
    ):
        if phrase in source_text:
            F.add("USF-ENTERPRISE-029", str(OPERATOR_ACCESS_LIFECYCLE_PROOF_PATH), f"readiness overclaim present: {phrase}")


def check_lane4_observability(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    model_text = json.dumps(model, sort_keys=True)
    for section, required_ids in LANE4_REQUIRED_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in required_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-010", row_id, f"missing Lane 4 row in {section}")
                continue
            row_text = json.dumps(row, sort_keys=True)
            for token in LANE4_REQUIRED_POSTURE_TOKENS:
                if token not in row_text:
                    F.add("USF-ENTERPRISE-010", row_id, f"missing required deferred-control token {token}")
            if "nonClaims" in row:
                if REQUIRED_NON_CLAIMS - set(row.get("nonClaims", [])):
                    F.add("USF-ENTERPRISE-010", row_id, "Lane 4 row non-claims are incomplete")
            else:
                row_text_lower = row_text.lower()
                missing_non_claims = [claim for claim in REQUIRED_NON_CLAIMS if claim not in row_text_lower]
                if missing_non_claims:
                    F.add("USF-ENTERPRISE-010", row_id, f"Lane 4 row text lacks non-claim tokens: {missing_non_claims}")
    for token in LANE4_OBSERVABILITY_TOKENS:
        if token not in model_text:
            F.add("USF-ENTERPRISE-010", "usf-188-observability-posture", f"missing {token}")
    standard = model.get("observabilityEvidenceStandard", {})
    required = set(standard.get("requiredFields", []))
    prohibited = set(standard.get("prohibitedFields", []))
    for field in ("signalKind", "incidentBoundary", "redactionStatus", "tenantLabelPosture", "dashboardBoundary"):
        if field not in required:
            F.add("USF-ENTERPRISE-010", f"observabilityEvidenceStandard.requiredFields.{field}", "missing Lane 4 required field")
    for field in ("rawSecret", "rawToken", "rawLogMessage", "unsafeLogMessage", "tenantName", "userEmail", "rawObjectKey"):
        if field not in prohibited:
            F.add("USF-ENTERPRISE-010", f"observabilityEvidenceStandard.prohibitedFields.{field}", "missing Lane 4 prohibited field")


def check_assurance_control_plane_disposition(F: Findings, state: dict[str, Any]) -> None:
    model = state["model"]
    matrix = state.get("closureMatrix")
    section_rows = {
        section: rows_by_id(model.get(section))
        for section in {
            "soaSupportMappings",
            "evidenceRegister",
            "threatModelAbuseCaseRegister",
            "accessReviewPrivilegedOperationPosture",
            "backupRestoreResiliencePosture",
            "incidentVulnerabilityManagementEvidence",
            "privacyDataMinimisationPosture",
        }
    }

    for control_id, config in ASSURANCE_CONTROL_PLANES.items():
        rows = config["rows"]
        expected_state = config["expectedState"]
        source_issue = config["issue"]

        for section, row_id in rows.items():
            row = section_rows.get(section, {}).get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-012", row_id, f"missing Lane 3 {control_id} row in {section}")
                continue
            texts = row_texts(row)
            if any(marker in text for marker in ASSURANCE_OVERCLAIM_MARKERS for text in texts):
                F.add("USF-ENTERPRISE-013", row_id, "assurance row contains an explicit readiness or certification claim marker")

            if section in {
                "soaSupportMappings",
                "accessReviewPrivilegedOperationPosture",
                "backupRestoreResiliencePosture",
                "incidentVulnerabilityManagementEvidence",
                "privacyDataMinimisationPosture",
            }:
                non_claims = set(row.get("nonClaims", []))
                missing_non_claims = REQUIRED_NON_CLAIMS - non_claims
                if missing_non_claims:
                    F.add("USF-ENTERPRISE-013", row_id, f"assurance row missing non-claims: {sorted(missing_non_claims)}")
                if not row.get("validationCommand"):
                    F.add("USF-ENTERPRISE-012", row_id, "assurance row lacks validation command")

            if section == "soaSupportMappings":
                if not row.get("owner") or not row.get("riskOwner") or not row.get("controlOwner"):
                    F.add("USF-ENTERPRISE-012", row_id, "SoA row lacks owner, risk owner, or control owner")
                if not row.get("assetServiceAffected"):
                    F.add("USF-ENTERPRISE-012", row_id, "SoA row lacks affected asset/service")
                texts = row_texts(row)
                for field in ASSURANCE_REQUIRED_RISK_FIELDS - {"affectedAssetService"}:
                    if not text_has_field(texts, field):
                        F.add("USF-ENTERPRISE-012", row_id, f"SoA row lacks {field}")
                if not text_has_field(texts, "effectivenessState"):
                    F.add("USF-ENTERPRISE-012", row_id, "SoA row lacks effectiveness state")
                elif not text_has_exact_field(texts, "effectivenessState", expected_state):
                    F.add("USF-ENTERPRISE-013", row_id, f"SoA row must remain effectivenessState={expected_state}")
            elif section == "evidenceRegister":
                issue_links = row.get("issueLinks", [])
                if "USF-187" not in issue_links or source_issue not in issue_links:
                    F.add("USF-ENTERPRISE-012", row_id, "evidence row lacks lane and source issue links")
                if not row.get("whatWasNotProven"):
                    F.add("USF-ENTERPRISE-013", row_id, "evidence row must state what was not proven")
                provider_mode = str(row.get("providerMode", "")).lower()
                if not any(marker in provider_mode for marker in ("not", "no-", "disposition")):
                    F.add("USF-ENTERPRISE-013", row_id, "evidence row provider mode must not imply live provider readiness")
            elif section == "threatModelAbuseCaseRegister":
                residual = [str(row.get("residualRisk", ""))]
                for field in ("riskStatement", "impact", "likelihood", "owner", "treatment", "reviewDate", "followUpIssue"):
                    if not text_has_field(residual, field):
                        F.add("USF-ENTERPRISE-012", row_id, f"threat residual risk lacks {field}")
            else:
                posture = [str(item) for item in row.get("posture", []) if isinstance(item, str)]
                for field in ASSURANCE_REQUIRED_RISK_FIELDS:
                    if not text_has_field(posture, field):
                        F.add("USF-ENTERPRISE-012", row_id, f"posture lacks {field}")
                if not text_has_field(posture, "effectivenessState"):
                    F.add("USF-ENTERPRISE-012", row_id, "posture lacks effectiveness state")
                elif not text_has_exact_field(posture, "effectivenessState", expected_state):
                    F.add("USF-ENTERPRISE-013", row_id, f"posture must remain effectivenessState={expected_state}")
                states = [
                    item.split("=", 1)[1]
                    for item in posture
                    if item.startswith("effectivenessState=") and "=" in item
                ]
                if any(state not in ASSURANCE_EFFECTIVENESS_STATES for state in states):
                    F.add("USF-ENTERPRISE-012", row_id, "posture has an unknown effectiveness state")
                if not text_has_field(posture, "exception"):
                    F.add("USF-ENTERPRISE-012", row_id, "posture lacks exception disposition")
                if text_has_exact_field(posture, "exception", "active"):
                    for field in ASSURANCE_EXCEPTION_FIELDS:
                        if not text_has_field(posture, field):
                            F.add("USF-ENTERPRISE-012", row_id, f"active exception lacks {field}")

        closure_service_id = config.get("closureServiceId")
        if matrix is not None and closure_service_id:
            closure_row = next(
                (
                    row
                    for row in matrix.get("rows", [])
                    if isinstance(row, dict) and row.get("service_id") == closure_service_id
                ),
                None,
            )
            if not closure_row:
                F.add("USF-ENTERPRISE-012", closure_service_id, "closure matrix lacks assurance service row")
            else:
                evidence = closure_row.get("closure_evidence", {})
                refs = set(evidence.get("enterprise_evidence_refs", []))
                expected_refs = {rows["soaSupportMappings"], rows["evidenceRegister"]}
                missing_refs = expected_refs - refs
                if missing_refs:
                    F.add("USF-ENTERPRISE-012", closure_service_id, f"closure matrix lacks Lane 3 refs: {sorted(missing_refs)}")
                tracking = set(evidence.get("tracking_issues", []))
                if "USF-187" not in tracking or source_issue not in tracking:
                    F.add("USF-ENTERPRISE-012", closure_service_id, "closure matrix lacks Lane 3/source tracking issues")
                sonarqube_bounded = (
                    closure_service_id == "sonarqube"
                    and evidence.get("closure_disposition") == "profile-gated-bounded-proof"
                    and evidence.get("closure_blocking") is False
                    and "usf-204-evidence-sonarqube-composed-proof" in refs
                )
                if evidence.get("closure_blocking") is not True and not sonarqube_bounded:
                    F.add("USF-ENTERPRISE-013", closure_service_id, "assurance control-plane closure must remain blocking")


def check_environment_promotion_standard(F: Findings, state: dict[str, Any]) -> None:
    promotion = state.get("environmentPromotion")
    if not isinstance(promotion, dict):
        F.add("USF-ENTERPRISE-015", str(ENVIRONMENT_PROMOTION_PATH), "environment promotion standard is missing")
        return

    if promotion.get("issueId") != "USF-193" or promotion.get("parentIssueId") != "USF-133":
        F.add("USF-ENTERPRISE-015", str(ENVIRONMENT_PROMOTION_PATH), "issue or parent linkage is incorrect")
    if promotion.get("serviceDispositionIssueId") != "USF-167":
        F.add("USF-ENTERPRISE-015", "serviceDispositionIssueId", "USF-167 must remain the service disposition gate")

    top_non_claims = set(promotion.get("nonClaims", []))
    missing_non_claims = PROMOTION_TOP_NON_CLAIMS - top_non_claims
    if missing_non_claims:
        F.add("USF-ENTERPRISE-018", "environmentPromotion.nonClaims", f"missing {sorted(missing_non_claims)}")

    stages: dict[str, dict[str, Any]] = {}
    for row in promotion.get("environmentStandards", []):
        if isinstance(row, dict) and isinstance(row.get("environmentStage"), str):
            stage = row["environmentStage"]
            if stage in stages:
                F.add("USF-ENTERPRISE-015", stage, "duplicate environment stage row")
            stages[stage] = row
    missing_stages = PROMOTION_STAGES - set(stages)
    if missing_stages:
        F.add("USF-ENTERPRISE-015", "environmentStandards", f"missing stages {sorted(missing_stages)}")

    for stage, row in stages.items():
        subject = f"environmentStandards.{stage}"
        for field in (
            "purpose",
            "proofRequirements",
            "validatorCommands",
            "enterpriseEvidenceRequirements",
            "promotionPrerequisites",
            "requiredApprover",
            "owners",
            "riskTreatment",
            "statementOfApplicabilitySupport",
            "promotionImpactBlockedUntilProven",
        ):
            if row.get(field) in (None, "", []):
                F.add("USF-ENTERPRISE-016", subject, f"missing {field}")

        owners = row.get("owners", {})
        if not isinstance(owners, dict):
            F.add("USF-ENTERPRISE-016", subject, "owners must be an object")
        else:
            for field in ("owner", "riskOwner", "controlOwner", "evidenceOwner"):
                if not owners.get(field):
                    F.add("USF-ENTERPRISE-016", subject, f"missing owners.{field}")

        risk = row.get("riskTreatment", {})
        if not isinstance(risk, dict):
            F.add("USF-ENTERPRISE-016", subject, "riskTreatment must be an object")
        else:
            for field in (
                "riskStatement",
                "threatFailureScenario",
                "impact",
                "likelihood",
                "treatment",
                "reviewDate",
                "followUpIssue",
            ):
                if not risk.get(field):
                    F.add("USF-ENTERPRISE-016", subject, f"missing riskTreatment.{field}")
            if not DATE_RE.fullmatch(str(risk.get("reviewDate", ""))):
                F.add("USF-ENTERPRISE-016", subject, "riskTreatment.reviewDate must be YYYY-MM-DD")
            if not str(risk.get("followUpIssue", "")).startswith("USF-"):
                F.add("USF-ENTERPRISE-016", subject, "riskTreatment.followUpIssue must be a USF issue")

        allowed = set(row.get("allowedClaims", []))
        prohibited = set(row.get("prohibitedClaims", []))
        unsafe_allowed = (PROMOTION_TOP_NON_CLAIMS - {"usf-133-closure"}) & allowed
        if unsafe_allowed:
            F.add("USF-ENTERPRISE-018", subject, f"allowedClaims overclaim readiness: {sorted(unsafe_allowed)}")
        if "usf-133-closure" in allowed:
            F.add("USF-ENTERPRISE-018", subject, "allowedClaims must not include USF-133 closure")
        if stage != "dev" and allowed:
            F.add("USF-ENTERPRISE-018", subject, "non-dev stage must not allow current readiness claims")
        if stage in {"dev", "test", "staging"} and "production-readiness" not in prohibited:
            F.add("USF-ENTERPRISE-018", subject, "lower environments must prohibit production readiness")
        if "iso27001-certification" not in prohibited and stage != "production":
            F.add("USF-ENTERPRISE-018", subject, "non-production stages must prohibit ISO certification claim")

    dev = stages.get("dev", {})
    if dev:
        if dev.get("defaultProviderMode") != "hermetic-mock":
            F.add("USF-ENTERPRISE-017", "dev.defaultProviderMode", "dev default must remain hermetic-mock")
        if "hermetic-mock" not in set(dev.get("permittedProviderModes", [])):
            F.add("USF-ENTERPRISE-017", "dev.permittedProviderModes", "dev must permit hermetic-mock")
        if dev.get("composeRequiredForRequiredServices") is not False:
            F.add("USF-ENTERPRISE-017", "dev.composeRequiredForRequiredServices", "dev Compose must remain proof-boundary-specific")
        if dev.get("syntheticDataOnly") is not True:
            F.add("USF-ENTERPRISE-016", "dev.syntheticDataOnly", "dev must remain synthetic-data only")

    test = stages.get("test", {})
    if test:
        if "hermetic-mock" in set(test.get("permittedProviderModes", [])):
            F.add("USF-ENTERPRISE-017", "test.permittedProviderModes", "in-memory/hermetic providers cannot satisfy test-composed proof")
        if test.get("defaultProviderMode") != "local-composed-real-service":
            F.add("USF-ENTERPRISE-017", "test.defaultProviderMode", "test must default to local-composed-real-service")
        if test.get("composeRequiredForRequiredServices") is not True:
            F.add("USF-ENTERPRISE-017", "test.composeRequiredForRequiredServices", "test must be composed for required services/providers")
        if test.get("destructiveTestingAllowed") is not True or test.get("syntheticDataOnly") is not True:
            F.add("USF-ENTERPRISE-017", "test.destructiveTestingAllowed", "test destructive semantics require synthetic resettable data")

    staging = stages.get("staging", {})
    if staging:
        if staging.get("destructiveTestingAllowed") is not False:
            F.add("USF-ENTERPRISE-017", "staging.destructiveTestingAllowed", "staging must not allow broad destructive testing")
        if staging.get("nonDestructiveOperationRequired") is not True:
            F.add("USF-ENTERPRISE-017", "staging.nonDestructiveOperationRequired", "staging must be non-destructive")
        if staging.get("dataPosture") != "controlled-non-production":
            F.add("USF-ENTERPRISE-017", "staging.dataPosture", "staging must use controlled non-production data")
        text = json.dumps(staging, sort_keys=True).lower()
        for token in ("migration", "rollback", "release", "non-destructive"):
            if token not in text:
                F.add("USF-ENTERPRISE-016", "staging.proofRequirements", f"staging lacks {token} evidence posture")

    production = stages.get("production", {})
    if production:
        if production.get("environmentClass") != "production-live":
            F.add("USF-ENTERPRISE-017", "production.environmentClass", "production must be production-live")
        if set(production.get("permittedProviderModes", [])) != {"live-external-provider"}:
            F.add("USF-ENTERPRISE-017", "production.permittedProviderModes", "production must require live-external-provider authority")
        if production.get("residualRiskApprovalRequired") is not True:
            F.add("USF-ENTERPRISE-016", "production.residualRiskApprovalRequired", "production requires approved residual risk")
        if production.get("destructiveTestingAllowed") is not False or production.get("nonDestructiveOperationRequired") is not True:
            F.add("USF-ENTERPRISE-017", "production.destructiveTestingAllowed", "production must be non-destructive")
        if production.get("dataPosture") != "production-governed":
            F.add("USF-ENTERPRISE-016", "production.dataPosture", "production must require governed production data posture")

    gates = promotion.get("promotionGates", [])
    gate_pairs = {(gate.get("from"), gate.get("to")) for gate in gates if isinstance(gate, dict)}
    expected_pairs = {("dev", "test"), ("test", "staging"), ("staging", "production")}
    if gate_pairs != expected_pairs:
        F.add("USF-ENTERPRISE-015", "promotionGates", f"expected gates {sorted(expected_pairs)}, got {sorted(gate_pairs)}")
    for gate in gates:
        if not isinstance(gate, dict):
            F.add("USF-ENTERPRISE-015", "promotionGates", "gate rows must be objects")
            continue
        gate_id = gate.get("id", "unknown")
        for field in ("requiredEvidence", "forbiddenEvidenceSubstitutions", "approver", "validationCommands", "nonClaims"):
            if gate.get(field) in (None, "", []):
                F.add("USF-ENTERPRISE-016", gate_id, f"missing {field}")
        if gate.get("riskAcceptanceRequired") is not True:
            F.add("USF-ENTERPRISE-016", gate_id, "risk acceptance must be required")
        if PROMOTION_TOP_NON_CLAIMS - set(gate.get("nonClaims", [])):
            F.add("USF-ENTERPRISE-018", gate_id, "promotion gate non-claims are incomplete")

    claim_rules = "\n".join(str(item) for item in promotion.get("claimRules", []))
    for token in PROMOTION_CLAIM_RULE_TOKENS:
        if token not in claim_rules:
            F.add("USF-ENTERPRISE-017", "claimRules", f"missing claim rule token: {token}")
    enterprise_text = "\n".join(str(item) for item in promotion.get("enterpriseAssuranceRequirements", []))
    for token in PROMOTION_REQUIRED_ENTERPRISE_TOKENS:
        if token not in enterprise_text:
            F.add("USF-ENTERPRISE-016", "enterpriseAssuranceRequirements", f"missing enterprise requirement: {token}")
    evidence_shape = set(promotion.get("evidencePackageShape", []))
    missing_shape = PROMOTION_REQUIRED_EVIDENCE_PACKAGE_TOKENS - evidence_shape
    if missing_shape:
        F.add("USF-ENTERPRISE-016", "evidencePackageShape", f"missing {sorted(missing_shape)}")
    negative = promotion.get("negativeAssurance", {})
    if not isinstance(negative, dict):
        F.add("USF-ENTERPRISE-018", "negativeAssurance", "negative assurance must be an object")
    else:
        negative_text = json.dumps(negative, sort_keys=True)
        for token in ("test readiness", "staging readiness", "production readiness", "ISO/IEC 27001 certification", "USF-133 closure"):
            if token not in negative_text:
                F.add("USF-ENTERPRISE-018", "negativeAssurance", f"missing negative assurance for {token}")

    model = state["model"]
    for section, required_ids in PROMOTION_REQUIRED_MODEL_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in required_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-016", row_id, f"missing USF-193 enterprise row in {section}")
                continue
            if missing_required_non_claims(row):
                F.add("USF-ENTERPRISE-018", row_id, "USF-193 enterprise row non-claims are incomplete")
            if section != "threatModelAbuseCaseRegister" and not row.get("validationCommand"):
                F.add("USF-ENTERPRISE-016", row_id, "USF-193 enterprise row lacks validation command")
            if section == "threatModelAbuseCaseRegister" and "validate-enterprise" not in json.dumps(row, sort_keys=True):
                F.add("USF-ENTERPRISE-016", row_id, "USF-193 threat row lacks validation reference")
            if section == "soaSupportMappings":
                for field in ("owner", "riskOwner", "controlOwner", "evidenceSource", "deferredReason"):
                    if not row.get(field):
                        F.add("USF-ENTERPRISE-016", row_id, f"SoA row lacks {field}")
                if str(ENVIRONMENT_PROMOTION_PATH) not in str(row.get("evidenceSource", "")):
                    F.add("USF-ENTERPRISE-016", row_id, "SoA row must link the promotion instance")
            elif section == "evidenceRegister":
                for issue in ("USF-193", "USF-167", "USF-184", "USF-192", "USF-133"):
                    if issue not in row.get("issueLinks", []):
                        F.add("USF-ENTERPRISE-016", row_id, f"evidence row lacks {issue}")
                if "not prove" not in str(row.get("whatWasNotProven", "")).lower():
                    F.add("USF-ENTERPRISE-018", row_id, "evidence row must preserve explicit non-proof boundary")


def check_operator_access_proof_wiring(F: Findings, state: dict[str, Any]) -> None:
    package = state.get("package")
    if not isinstance(package, dict):
        F.add("USF-ENTERPRISE-019", str(PACKAGE_PATH), "package metadata is missing")
        return
    scripts = package.get("scripts", {})
    if not isinstance(scripts, dict):
        F.add("USF-ENTERPRISE-019", "package.scripts", "package scripts are missing")
        return
    expected_command = "tsx packages/proof/src/operator-access-proof.ts"
    if scripts.get("proof:operator-access") != expected_command:
        F.add("USF-ENTERPRISE-019", "proof:operator-access", "operator access proof command is missing or stale")
    if "proof:operator-access" not in str(scripts.get("verify", "")):
        F.add("USF-ENTERPRISE-019", "verify", "verify does not run operator access proof")

    proof_path = ROOT / OPERATOR_ACCESS_PROOF_PATH
    if not proof_path.exists():
        F.add("USF-ENTERPRISE-019", str(OPERATOR_ACCESS_PROOF_PATH), "operator access proof file is missing")
        return
    proof_text = state.get("operatorAccessProofText")
    if not isinstance(proof_text, str):
        F.add("USF-ENTERPRISE-019", str(OPERATOR_ACCESS_PROOF_PATH), "operator access proof text is missing")
        return
    for required in (
        "USF-169",
        "operatorConsoleRuntimeReadinessClaim: false",
        "gatewayReadinessClaim: false",
        "clickthroughReadinessClaim: false",
        "publicExposureClaim: false",
        "productionLiveClaim: false",
        "deferredBoundaries",
        "provider.readiness.checked",
        "observability.readiness.read",
        "observability.signal.read",
    ):
        if required not in proof_text:
            F.add("USF-ENTERPRISE-019", str(OPERATOR_ACCESS_PROOF_PATH), f"operator access proof lacks {required}")
    compact = proof_text.lower().replace(" ", "")
    for prohibited in (
        "operatorconsoleruntimereadinessclaim:true",
        "gatewayreadinessclaim:true",
        "clickthroughreadinessclaim:true",
        "publicexposureclaim:true",
        "productionliveclaim:true",
    ):
        if prohibited in compact:
            F.add("USF-ENTERPRISE-019", str(OPERATOR_ACCESS_PROOF_PATH), "operator access proof overclaims readiness")


def check_gateway_clickthrough_substrate(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("gatewayClickthroughMatrix")
    if not isinstance(matrix, dict):
        F.add("USF-ENTERPRISE-020", str(GATEWAY_CLICKTHROUGH_MATRIX_PATH), "gateway clickthrough substrate matrix is missing")
        return

    services = {
        service.get("serviceId"): service
        for service in state["serviceCatalogue"].get("services", [])
        if isinstance(service, dict) and isinstance(service.get("serviceId"), str)
    }
    caddy = services.get("caddy", {})
    if not isinstance(caddy, dict):
        F.add("USF-ENTERPRISE-020", "caddy", "service catalogue lacks caddy gateway row")
        return

    expected_top = {
        "sourceIssue": "USF-180",
        "parentIssue": "USF-133",
        "serviceId": "caddy",
        "serviceCatalogueAuthority": str(SERVICE_CATALOGUE_PATH),
        "operatorAccessMatrix": str(OPERATOR_ACCESS_MATRIX_PATH),
        "apiContractStandard": "docs/architecture/api-and-contract-surface-standard.md",
        "environmentPromotionStandard": str(ENVIRONMENT_PROMOTION_PATH),
        "enterpriseEvidenceModel": str(MODEL_PATH),
        "validationCommand": "python3 tools/validate-enterprise/validate-enterprise.py all --json",
    }
    for key, expected in expected_top.items():
        if matrix.get(key) != expected:
            F.add("USF-ENTERPRISE-020", key, f"expected {expected!r}")

    issue_links = set(matrix.get("issueLinks", []))
    if GATEWAY_CLICKTHROUGH_REQUIRED_ISSUES - issue_links:
        F.add("USF-ENTERPRISE-020", "issueLinks", "gateway matrix issue links are incomplete")
    if REQUIRED_NON_CLAIMS - set(matrix.get("nonClaims", [])):
        F.add("USF-ENTERPRISE-020", "nonClaims", "gateway matrix non-claims are incomplete")
    if REQUIRED_NON_CLAIMS & set(matrix.get("readinessClaimsAllowed", [])):
        F.add("USF-ENTERPRISE-020", "readinessClaimsAllowed", "gateway matrix allows prohibited readiness claim")
    if GATEWAY_CLICKTHROUGH_PROHIBITED_CLAIMS - set(matrix.get("readinessClaimsProhibited", [])):
        F.add("USF-ENTERPRISE-020", "readinessClaimsProhibited", "gateway matrix prohibited claims are incomplete")

    decision = matrix.get("humanDecision", {})
    if not isinstance(decision, dict) or decision.get("decisionState") != "accepted":
        F.add("USF-ENTERPRISE-020", "humanDecision", "accepted human decision must be recorded")
    elif decision.get("decisionIsWorkComplete") is not False:
        F.add("USF-ENTERPRISE-020", "humanDecision.decisionIsWorkComplete", "decision must not mean work complete")

    inclusion = matrix.get("gatewayInclusion", {})
    if not isinstance(inclusion, dict):
        F.add("USF-ENTERPRISE-020", "gatewayInclusion", "gateway inclusion must be an object")
    else:
        expected_inclusion = {
            "includedForDevFoundationAssessment": True,
            "serviceCatalogueServiceId": "caddy",
            "composeProfile": "gateway",
            "localHostPublication": "loopback-only",
            "publicExposureAllowed": False,
            "lanExposureAllowed": False,
            "productionExposureAllowedByThisIssue": False,
            "gatewayReadinessClaim": False,
            "deploymentReadinessClaim": False,
        }
        for key, expected in expected_inclusion.items():
            observed = inclusion.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-ENTERPRISE-020", f"gatewayInclusion.{key}", f"expected {expected!r}")
        if not inclusion.get("evidenceBoundary") or "no runtime route" not in str(inclusion.get("evidenceBoundary", "")):
            F.add("USF-ENTERPRISE-020", "gatewayInclusion.evidenceBoundary", "gateway evidence boundary must deny route readiness")

    if caddy.get("serviceKind") != "gateway":
        F.add("USF-ENTERPRISE-020", "caddy.serviceKind", "caddy must remain classified as gateway")
    if "gateway" not in set(caddy.get("composeProfiles", [])):
        F.add("USF-ENTERPRISE-020", "caddy.composeProfiles", "caddy must remain gateway-profile gated")
    ports = caddy.get("ports", [])
    port_map = {port.get("portId"): port for port in ports if isinstance(port, dict)}
    for port_id, published_port in (("gateway-http", 8081), ("gateway-https", 8443)):
        port = port_map.get(port_id, {})
        if port.get("hostIp") != "127.0.0.1" or port.get("bindScope") != "loopback-only":
            F.add("USF-ENTERPRISE-020", f"caddy.{port_id}", "gateway ports must remain loopback-only")
        if port.get("internetExposureAllowed") is not False:
            F.add("USF-ENTERPRISE-020", f"caddy.{port_id}", "gateway port internet exposure must be denied")
        if port.get("publishedPort") != published_port:
            F.add("USF-ENTERPRISE-020", f"caddy.{port_id}", f"expected published port {published_port}")

    trusted_proxy = matrix.get("trustedProxyPolicy", {})
    if not isinstance(trusted_proxy, dict):
        F.add("USF-ENTERPRISE-020", "trustedProxyPolicy", "trusted proxy policy must be an object")
    else:
        if trusted_proxy.get("directClientForwardedHeadersTrusted") is not False:
            F.add("USF-ENTERPRISE-020", "trustedProxyPolicy.directClientForwardedHeadersTrusted", "direct client forwarded headers must not be trusted")
        if not trusted_proxy.get("trustedProxySources") or not trusted_proxy.get("requiredBeforeStrongerReadiness"):
            F.add("USF-ENTERPRISE-020", "trustedProxyPolicy", "trusted proxy sources and stronger-readiness proof requirements are required")
        policy_text = json.dumps(trusted_proxy, sort_keys=True).lower()
        for token in ("forwarded", "local gateway", "header"):
            if token not in policy_text:
                F.add("USF-ENTERPRISE-020", "trustedProxyPolicy", f"trusted proxy policy lacks {token}")

    sso = matrix.get("ssoPosture", {})
    if not isinstance(sso, dict):
        F.add("USF-ENTERPRISE-020", "ssoPosture", "SSO posture must be an object")
    else:
        if sso.get("localSsoReadinessClaim") is not False or sso.get("liveSsoReadinessClaim") is not False:
            F.add("USF-ENTERPRISE-020", "ssoPosture", "SSO readiness claims must remain false")
        if not sso.get("operatorAuthBoundary") or not sso.get("identityProviderBoundary") or not sso.get("requiredBeforeTestReadiness"):
            F.add("USF-ENTERPRISE-020", "ssoPosture", "SSO boundaries and test-readiness requirements are required")

    transport = matrix.get("localTransportBoundary", {})
    if not isinstance(transport, dict):
        F.add("USF-ENTERPRISE-020", "localTransportBoundary", "local transport boundary must be an object")
    else:
        expected_transport = {
            "hostIp": "127.0.0.1",
            "httpPublishedPort": 8081,
            "httpsPublishedPort": 8443,
            "publicExposureAllowed": False,
            "lanExposureAllowed": False,
        }
        for key, expected in expected_transport.items():
            observed = transport.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-ENTERPRISE-020", f"localTransportBoundary.{key}", f"expected {expected!r}")
        if "No WAF" not in str(transport.get("wafPolicy", "")):
            F.add("USF-ENTERPRISE-020", "localTransportBoundary.wafPolicy", "WAF non-claim must be explicit")

    routing = matrix.get("serviceRoutingBoundary", {})
    if not isinstance(routing, dict):
        F.add("USF-ENTERPRISE-020", "serviceRoutingBoundary", "service routing boundary must be an object")
    else:
        if routing.get("routeImplementationCreated") is not False or routing.get("routeProofPresent") is not False:
            F.add("USF-ENTERPRISE-020", "serviceRoutingBoundary", "route implementation/proof claims must remain false")
        if "USF-155" not in set(routing.get("routeProofDeferredTo", [])):
            F.add("USF-ENTERPRISE-020", "serviceRoutingBoundary.routeProofDeferredTo", "route proof must be deferred to USF-155")
        if not routing.get("nonEquivalenceBoundary"):
            F.add("USF-ENTERPRISE-020", "serviceRoutingBoundary.nonEquivalenceBoundary", "routing non-equivalence boundary is required")

    clickthrough = matrix.get("clickthroughBoundary", {})
    if not isinstance(clickthrough, dict):
        F.add("USF-ENTERPRISE-020", "clickthroughBoundary", "clickthrough boundary must be an object")
    else:
        expected_clickthrough = {
            "clickthroughUiImplementationPresent": False,
            "clickthroughRuntimeProofPresent": False,
            "acceptedDeferral": True,
            "requiredBeforeTestReadiness": True,
        }
        for key, expected in expected_clickthrough.items():
            observed = clickthrough.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-ENTERPRISE-020", f"clickthroughBoundary.{key}", f"expected {expected!r}")
        if "USF-155" not in set(clickthrough.get("deferredTo", [])):
            F.add("USF-ENTERPRISE-020", "clickthroughBoundary.deferredTo", "clickthrough must be deferred to USF-155")
        if len(clickthrough.get("proofCriteria", [])) < 6:
            F.add("USF-ENTERPRISE-020", "clickthroughBoundary.proofCriteria", "clickthrough proof criteria are incomplete")
        if not clickthrough.get("nonEquivalenceBoundary"):
            F.add("USF-ENTERPRISE-020", "clickthroughBoundary.nonEquivalenceBoundary", "clickthrough non-equivalence boundary is required")

    dependencies = matrix.get("dependencyLinks", {})
    expected_dependencies = {
        "operatorAccessProof": "USF-169",
        "apiGatewayCompatibility": "USF-155",
        "observabilityOperations": "USF-179",
        "environmentPromotionStandard": "USF-193",
    }
    if not isinstance(dependencies, dict):
        F.add("USF-ENTERPRISE-020", "dependencyLinks", "dependency links must be an object")
    else:
        for key, expected in expected_dependencies.items():
            if dependencies.get(key) != expected:
                F.add("USF-ENTERPRISE-020", f"dependencyLinks.{key}", f"expected {expected!r}")

    declared_evidence = set(matrix.get("enterpriseEvidenceRefs", []))
    required_evidence = set().union(*GATEWAY_CLICKTHROUGH_REQUIRED_EVIDENCE_ROWS.values())
    if declared_evidence != required_evidence:
        F.add("USF-ENTERPRISE-020", "enterpriseEvidenceRefs", "gateway matrix enterprise evidence refs are incomplete")

    model = state["model"]
    for section, row_ids in GATEWAY_CLICKTHROUGH_REQUIRED_EVIDENCE_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in row_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-020", row_id, f"missing USF-180 enterprise row in {section}")
                continue
            row_text = json.dumps(row, sort_keys=True)
            if missing_required_non_claims(row):
                F.add("USF-ENTERPRISE-020", row_id, "USF-180 enterprise row non-claims are incomplete")
            if "USF-180" not in row_text or str(GATEWAY_CLICKTHROUGH_MATRIX_PATH) not in row_text:
                F.add("USF-ENTERPRISE-020", row_id, "USF-180 enterprise row lacks issue or matrix linkage")
            if section != "threatModelAbuseCaseRegister" and not row.get("validationCommand"):
                F.add("USF-ENTERPRISE-020", row_id, "USF-180 enterprise row lacks validation command")
            if section == "evidenceRegister":
                for issue in GATEWAY_CLICKTHROUGH_REQUIRED_ISSUES:
                    if issue not in row.get("issueLinks", []):
                        F.add("USF-ENTERPRISE-020", row_id, f"evidence row lacks {issue}")
                if "not prove" not in str(row.get("whatWasNotProven", "")).lower():
                    F.add("USF-ENTERPRISE-020", row_id, "evidence row must preserve explicit non-proof boundary")


def check_static_analysis_quality_gate_disposition(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("staticAnalysisMatrix")
    if not isinstance(matrix, dict):
        F.add("USF-ENTERPRISE-021", str(STATIC_ANALYSIS_MATRIX_PATH), "static-analysis quality-gate disposition matrix is missing")
        return

    expected_top = {
        "sourceIssue": "USF-171",
        "followUpIssue": "USF-195",
        "remainingProofIssue": "USF-169",
        "laneIssue": "USF-187",
        "parentIssue": "USF-133",
        "serviceId": "sonarqube",
        "serviceCatalogueAuthority": str(SERVICE_CATALOGUE_PATH),
        "closureMatrix": str(CLOSURE_MATRIX_PATH),
        "enterpriseEvidenceModel": str(MODEL_PATH),
        "validationCommand": "python3 tools/validate-enterprise/validate-enterprise.py all --json",
    }
    for key, expected in expected_top.items():
        if matrix.get(key) != expected:
            F.add("USF-ENTERPRISE-021", key, f"expected {expected!r}")

    if STATIC_ANALYSIS_REQUIRED_ISSUES - set(matrix.get("issueLinks", [])):
        F.add("USF-ENTERPRISE-021", "issueLinks", "static-analysis matrix issue links are incomplete")
    if matrix.get("resolvedProofIssue") != "USF-204":
        F.add("USF-ENTERPRISE-021", "resolvedProofIssue", "static-analysis matrix must record USF-204 as resolved proof")
    if REQUIRED_NON_CLAIMS - set(matrix.get("nonClaims", [])):
        F.add("USF-ENTERPRISE-021", "nonClaims", "static-analysis matrix non-claims are incomplete")
    if REQUIRED_NON_CLAIMS & set(matrix.get("readinessClaimsAllowed", [])):
        F.add("USF-ENTERPRISE-021", "readinessClaimsAllowed", "static-analysis matrix allows a prohibited readiness claim")
    if STATIC_ANALYSIS_PROHIBITED_CLAIMS - set(matrix.get("readinessClaimsProhibited", [])):
        F.add("USF-ENTERPRISE-021", "readinessClaimsProhibited", "static-analysis prohibited claims are incomplete")

    decision = matrix.get("humanDecision", {})
    if not isinstance(decision, dict) or decision.get("decisionState") != "accepted":
        F.add("USF-ENTERPRISE-021", "humanDecision", "accepted human decision must be recorded")
    elif decision.get("decisionIsWorkComplete") is not False:
        F.add("USF-ENTERPRISE-021", "humanDecision.decisionIsWorkComplete", "decision must not mean work complete")

    disposition = matrix.get("sonarqubeDisposition", {})
    if not isinstance(disposition, dict):
        F.add("USF-ENTERPRISE-021", "sonarqubeDisposition", "SonarQube disposition must be an object")
    else:
        expected_disposition = {
            "disposition": "profile-gated-bounded-proof-with-deferred-boundaries",
            "serviceSemanticProofPresent": True,
            "serviceReadinessClaim": False,
            "qualityGateReadinessClaim": False,
            "serviceCatalogueServiceId": "sonarqube",
            "followUpIssue": "USF-195",
            "remainingProofIssue": "USF-169",
            "owner": "platform-assurance-foundation",
            "riskOwner": "platform-assurance-risk-owner",
            "controlOwner": "platform-assurance-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_disposition.items():
            observed = disposition.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-ENTERPRISE-021", f"sonarqubeDisposition.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "deferredEvidence"):
            if disposition.get(field) in (None, "", []):
                F.add("USF-ENTERPRISE-021", f"sonarqubeDisposition.{field}", "SonarQube deferral field is required")
        if disposition.get("resolvedProofIssue") != "USF-204":
            F.add("USF-ENTERPRISE-021", "sonarqubeDisposition.resolvedProofIssue", "USF-204 must be recorded as resolved proof")

    local_gate = matrix.get("localVerificationGate", {})
    if not isinstance(local_gate, dict):
        F.add("USF-ENTERPRISE-021", "localVerificationGate", "local verification gate must be an object")
    else:
        if local_gate.get("usedAsSubstituteForLocalDeterministicChecks") is not True:
            F.add("USF-ENTERPRISE-021", "localVerificationGate.usedAsSubstituteForLocalDeterministicChecks", "local deterministic substitution must be explicit")
        if local_gate.get("sonarqubeServiceEquivalent") is not False:
            F.add("USF-ENTERPRISE-021", "localVerificationGate.sonarqubeServiceEquivalent", "local checks must not be SonarQube service equivalent")
        commands = set(local_gate.get("commands", []))
        for command in ("corepack pnpm verify", "corepack pnpm parity", "python3 tools/validate-enterprise/validate-enterprise.py all --json"):
            if command not in commands:
                F.add("USF-ENTERPRISE-021", "localVerificationGate.commands", f"missing {command}")
        if not local_gate.get("substitutionNonEquivalenceBoundary"):
            F.add("USF-ENTERPRISE-021", "localVerificationGate.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
        if len(local_gate.get("scopeCovered", [])) < 6 or len(local_gate.get("limits", [])) < 6:
            F.add("USF-ENTERPRISE-021", "localVerificationGate", "verification scope and limits are incomplete")

    scanning = matrix.get("securityScanningPosture", {})
    if not isinstance(scanning, dict):
        F.add("USF-ENTERPRISE-021", "securityScanningPosture", "security scanning posture must be an object")
    else:
        expected_false = {
            "scannerServiceReadinessClaim",
            "vulnerabilityClearanceClaim",
            "dependencyAdvisoryClearanceClaim",
            "secretScanningCompletenessClaim",
        }
        for key in expected_false:
            if scanning.get(key) is not False:
                F.add("USF-ENTERPRISE-021", f"securityScanningPosture.{key}", "scanner readiness or clearance claims must remain false")
        if scanning.get("followUpIssue") != "USF-195":
            F.add("USF-ENTERPRISE-021", "securityScanningPosture.followUpIssue", "security scanning posture must link USF-195")
        if scanning.get("remainingProofIssue") != "USF-204":
            F.add(
                "USF-ENTERPRISE-021",
                "securityScanningPosture.remainingProofIssue",
                "security scanning posture must link remaining proof to USF-204",
            )

    boundary = matrix.get("operatorAccessAuditRetentionSupplierBoundary", {})
    if not isinstance(boundary, dict):
        F.add("USF-ENTERPRISE-021", "operatorAccessAuditRetentionSupplierBoundary", "operator/access boundary must be an object")
    else:
        for field in (
            "operatorAccessBoundary",
            "authRequirement",
            "auditRequirement",
            "retentionBoundary",
            "secretBoundary",
            "supplierBoundary",
            "incidentBoundary",
        ):
            if not boundary.get(field):
                F.add("USF-ENTERPRISE-021", f"operatorAccessAuditRetentionSupplierBoundary.{field}", "boundary field is required")

    declared_evidence = set(matrix.get("enterpriseEvidenceRefs", []))
    required_evidence = set().union(*STATIC_ANALYSIS_REQUIRED_EVIDENCE_ROWS.values())
    if declared_evidence != required_evidence:
        F.add("USF-ENTERPRISE-021", "enterpriseEvidenceRefs", "static-analysis enterprise evidence refs are incomplete")

    model = state["model"]
    for section, row_ids in STATIC_ANALYSIS_REQUIRED_EVIDENCE_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in row_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-021", row_id, f"missing USF-171 enterprise row in {section}")
                continue
            row_text = json.dumps(row, sort_keys=True)
            if missing_required_non_claims(row):
                F.add("USF-ENTERPRISE-021", row_id, "USF-171 enterprise row non-claims are incomplete")
            if "USF-171" not in row_text or "USF-195" not in row_text or str(STATIC_ANALYSIS_MATRIX_PATH) not in row_text:
                F.add("USF-ENTERPRISE-021", row_id, "USF-171 enterprise row lacks issue, follow-up, or matrix linkage")
            if section != "threatModelAbuseCaseRegister" and not row.get("validationCommand"):
                F.add("USF-ENTERPRISE-021", row_id, "USF-171 enterprise row lacks validation command")
            if section == "evidenceRegister":
                for issue in STATIC_ANALYSIS_REQUIRED_ISSUES:
                    if issue not in row.get("issueLinks", []):
                        F.add("USF-ENTERPRISE-021", row_id, f"evidence row lacks {issue}")
                if "not prove" not in str(row.get("whatWasNotProven", "")).lower():
                    F.add("USF-ENTERPRISE-021", row_id, "evidence row must preserve explicit non-proof boundary")

    assurance_text = json.dumps(model, sort_keys=True)
    for stale in ("until USF-171 closes", "followUpIssue=USF-171"):
        if stale in assurance_text:
            F.add("USF-ENTERPRISE-021", "enterprise-evidence-stale-self-deferral", f"stale self-deferral remains: {stale}")


def check_sonarqube_service_proof_boundary(F: Findings, state: dict[str, Any]) -> None:
    boundary = state.get("sonarqubeProofBoundary")
    if not isinstance(boundary, dict):
        F.add("USF-ENTERPRISE-023", str(SONARQUBE_PROOF_BOUNDARY_PATH), "SonarQube proof boundary is missing")
        return

    expected_top = {
        "sourceIssue": "USF-204",
        "zeroIssueAssuranceIssue": "USF-233",
        "followUpIssue": "USF-169",
        "sourceDispositionIssue": "USF-171",
        "laneIssue": "USF-187",
        "parentIssue": "USF-133",
        "status": "profile-gated-bounded-proof-with-deferred-boundaries",
        "serviceCatalogueAuthority": str(SERVICE_CATALOGUE_PATH),
        "closureMatrix": str(CLOSURE_MATRIX_PATH),
        "staticAnalysisDispositionMatrix": str(STATIC_ANALYSIS_MATRIX_PATH),
        "enterpriseEvidenceModel": str(MODEL_PATH),
        "zeroIssueAssurance": str(SONARQUBE_ZERO_ISSUE_ASSURANCE_PATH),
        "validationCommand": "corepack pnpm proof:assurance:sonarqube",
    }
    for key, expected in expected_top.items():
        if boundary.get(key) != expected:
            F.add("USF-ENTERPRISE-023", key, f"expected {expected!r}")
    if boundary.get("predecessorIssue") != "USF-195":
        F.add("USF-ENTERPRISE-023", "predecessorIssue", "SonarQube boundary must preserve USF-195 lineage")

    if set(boundary.get("serviceIds", [])) != SONARQUBE_BOUNDARY_REQUIRED_SERVICES:
        F.add("USF-ENTERPRISE-023", "serviceIds", "SonarQube boundary service ids are incomplete")
    if SONARQUBE_BOUNDARY_REQUIRED_ISSUES - set(boundary.get("issueLinks", [])):
        F.add("USF-ENTERPRISE-023", "issueLinks", "SonarQube boundary issue links are incomplete")
    if REQUIRED_NON_CLAIMS - set(boundary.get("nonClaims", [])):
        F.add("USF-ENTERPRISE-023", "nonClaims", "SonarQube boundary non-claims are incomplete")
    if SONARQUBE_BOUNDARY_PROHIBITED_CLAIMS - set(boundary.get("readinessClaimsProhibited", [])):
        F.add("USF-ENTERPRISE-023", "readinessClaimsProhibited", "SonarQube boundary prohibited claims are incomplete")
    if SONARQUBE_BOUNDARY_PROHIBITED_CLAIMS & set(boundary.get("readinessClaimsAllowed", [])):
        F.add("USF-ENTERPRISE-023", "readinessClaimsAllowed", "SonarQube boundary allows a prohibited readiness claim")

    reclassification = boundary.get("reclassification", {})
    if not isinstance(reclassification, dict):
        F.add("USF-ENTERPRISE-023", "reclassification", "SonarQube reclassification must be an object")
    else:
        expected_reclassification = {
            "from": "requires-human-decision",
            "to": "profile-gated-bounded-local-compose-proof",
            "decisionAcceptedDoesNotMeanWorkComplete": True,
            "serviceSemanticProofImplemented": True,
            "sonarqubeServiceReadinessClaim": False,
            "qualityGateReadinessClaim": False,
            "scannerReadinessClaim": False,
            "localVerificationEquivalentToSonarQubeService": False,
        }
        for key, expected in expected_reclassification.items():
            observed = reclassification.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-ENTERPRISE-023", f"reclassification.{key}", f"expected {expected!r}")
        evidence_refs = set(reclassification.get("repositoryEvidence", []))
        for required_ref in (
            "packages/proof/src/sonarqube-composed-proof.ts",
            "adapters/assurance/src/index.ts",
            "packages/core/src/index.ts#quality-gate-sonarqube-composed-test",
            str(SONARQUBE_PROOF_BOUNDARY_PATH),
        ):
            if required_ref not in evidence_refs:
                F.add("USF-ENTERPRISE-023", "reclassification.repositoryEvidence", f"missing {required_ref}")
        if len(evidence_refs) < 6:
            F.add("USF-ENTERPRISE-023", "reclassification.repositoryEvidence", "repository evidence refs are incomplete")

    remaining = boundary.get("remainingProofBoundary", {})
    if not isinstance(remaining, dict):
        F.add("USF-ENTERPRISE-023", "remainingProofBoundary", "remaining proof boundary must be an object")
    else:
        expected_remaining = {
            "issue": "USF-169",
            "owner": "platform-assurance-foundation",
            "riskOwner": "platform-assurance-risk-owner",
            "controlOwner": "platform-assurance-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_remaining.items():
            if remaining.get(key) != expected:
                F.add("USF-ENTERPRISE-023", f"remainingProofBoundary.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "requiredEvidence"):
            if remaining.get(field) in (None, "", []):
                F.add("USF-ENTERPRISE-023", f"remainingProofBoundary.{field}", "remaining proof field is required")
        if "USF-193" not in set(remaining.get("additionalFollowUpIssues", [])):
            F.add("USF-ENTERPRISE-023", "remainingProofBoundary.additionalFollowUpIssues", "remaining proof boundary must link USF-193")
        if len(remaining.get("requiredEvidence", [])) < 5:
            F.add("USF-ENTERPRISE-023", "remainingProofBoundary.requiredEvidence", "remaining proof evidence list is incomplete")

    quality = boundary.get("qualityGateBoundary", {})
    expected_quality = {
        "scopeStatus": "profile-gated-bounded-proof",
        "zeroIssueAssuranceIssue": "USF-233",
        "supportedScanScope": "local-synthetic-typescript-project",
        "zeroIssueRequirementStatus": "enforced-by-proof-for-supported-local-synthetic-scan-scope",
        "zeroIssueRequirement": "quality-gate-status-OK-and-zero-unresolved-issues-and-zero-security-hotspots",
        "unresolvedIssueHandlingStatus": "query-path-proven-zero-open-for-synthetic-project",
        "exceptionHandlingStatus": "quality-gate-fail-closed-readback-proven-policy-administration-deferred",
        "securityHotspotTreatmentStatus": "query-path-proven-zero-hotspots-human-review-deferred",
        "qualityGatePolicyAdministrationClaim": False,
        "vulnerabilityClearanceClaim": False,
        "repositoryWideZeroIssueReadinessClaim": False,
    }
    for field, expected in expected_quality.items():
        observed = quality.get(field)
        if observed is not expected if isinstance(expected, bool) else observed != expected:
            F.add("USF-ENTERPRISE-023", f"qualityGateBoundary.{field}", f"expected {expected!r}")
    for field in ("owner", "riskOwner", "controlOwner", "reviewDate"):
        if not quality.get(field):
            F.add("USF-ENTERPRISE-023", f"qualityGateBoundary.{field}", "quality gate owner metadata is required")
    if not quality.get("exclusionsJustification"):
        F.add("USF-ENTERPRISE-023", "qualityGateBoundary.exclusionsJustification", "zero-issue exclusions must be justified")

    operator = boundary.get("operatorAccessAuditRetentionSupplierBoundary", {})
    for field in (
        "operatorAccessBoundary",
        "authRequirement",
        "auditRequirement",
        "retentionBoundary",
        "secretBoundary",
        "supplierBoundary",
        "incidentBoundary",
    ):
        if not operator.get(field):
            F.add("USF-ENTERPRISE-023", f"operatorAccessAuditRetentionSupplierBoundary.{field}", "operator boundary field is required")
    unsafe_boundary_re = re.compile(r"https?://|127\.0\.0\.1|localhost|squ_|connection_string|admin:admin", re.IGNORECASE)
    operator_text = json.dumps(operator, sort_keys=True)
    if unsafe_boundary_re.search(operator_text):
        F.add(
            "USF-ENTERPRISE-023",
            "operatorAccessAuditRetentionSupplierBoundary",
            "operator boundary must not expose raw endpoints, credentials, connection strings, or token values",
        )

    local_gate = boundary.get("localVerificationGate", {})
    if local_gate.get("repositoryValidationRequired") is not True:
        F.add("USF-ENTERPRISE-023", "localVerificationGate.repositoryValidationRequired", "repository validation must remain required")
    if local_gate.get("sonarqubeServiceEquivalent") is not False:
        F.add("USF-ENTERPRISE-023", "localVerificationGate.sonarqubeServiceEquivalent", "local validation must not be SonarQube service equivalent")
    if not local_gate.get("substitutionNonEquivalenceBoundary"):
        F.add("USF-ENTERPRISE-023", "localVerificationGate.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
    if "python3 tools/validate-enterprise/validate-enterprise.py all --json" not in set(local_gate.get("commands", [])):
        F.add("USF-ENTERPRISE-023", "localVerificationGate.commands", "enterprise validation command is required")
    if "corepack pnpm proof:assurance:sonarqube" not in set(local_gate.get("commands", [])):
        F.add("USF-ENTERPRISE-023", "localVerificationGate.commands", "SonarQube proof command is required")

    composed = boundary.get("composedProof", {})
    if not isinstance(composed, dict):
        F.add("USF-ENTERPRISE-023", "composedProof", "SonarQube composed proof metadata is required")
    else:
        expected_composed = {
            "issue": "USF-204",
            "zeroIssueAssuranceIssue": "USF-233",
            "proofCommand": "corepack pnpm proof:assurance:sonarqube",
            "packageScript": "proof:assurance:sonarqube",
            "makeTarget": "sonarqube-assurance-proof",
            "providerRegistryId": "quality-gate-sonarqube-composed-test",
            "adapterName": "SonarQubeComposedQualityGateAdapter",
            "sdkPackage": "@sonar/scan",
            "sdkVersion": "4.3.8",
            "webApiBoundary": "sonarqube-web-api-no-maintained-js-admin-sdk-exception; Web API calls are confined to adapters/assurance for readiness, temporary credential lifecycle, quality gate readback, issue and hotspot query, and cleanup.",
            "zeroIssueGateScope": "local-synthetic-typescript-project",
            "zeroIssueRequirement": "quality-gate-ok-and-zero-unresolved-issues-and-zero-security-hotspots",
            "zeroIssueRequirementEnforced": True,
            "qualityGatePolicyAdministrationClaim": False,
            "vulnerabilityClearanceClaim": False,
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_composed.items():
            observed = composed.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-ENTERPRISE-023", f"composedProof.{key}", f"expected {expected!r}")
        if "official SonarSource" not in str(composed.get("sdkSelectionRationale", "")):
            F.add("USF-ENTERPRISE-023", "composedProof.sdkSelectionRationale", "official SonarSource SDK rationale is required")
        for field in (
            "serviceReadinessProof",
            "scannerExecutionProof",
            "qualityGateProof",
            "unresolvedIssueHandlingProof",
            "securityHotspotTreatmentProof",
            "zeroIssueGateProof",
            "operatorAccessProof",
            "retentionCleanupProof",
            "redactionProof",
        ):
            if not composed.get(field):
                F.add("USF-ENTERPRISE-023", f"composedProof.{field}", "composed proof evidence field is required")

    package = state.get("package") or {}
    scripts = package.get("scripts") if isinstance(package, dict) else {}
    if not isinstance(scripts, dict) or scripts.get("proof:assurance:sonarqube") != "tsx packages/proof/src/sonarqube-composed-proof.ts":
        F.add("USF-ENTERPRISE-023", "package.json#proof:assurance:sonarqube", "SonarQube proof package script is missing or stale")
    if isinstance(scripts, dict) and "proof:assurance:sonarqube" not in str(scripts.get("verify", "")):
        F.add("USF-ENTERPRISE-023", "package.json#verify", "verify must run SonarQube proof")
    if package.get("dependencies", {}).get("@sonar/scan") != "4.3.8":
        F.add("USF-ENTERPRISE-023", "package.json#@sonar/scan", "SonarQube SDK dependency must be exact-version pinned")
    if "\nsonarqube-assurance-proof:" not in f"\n{state['makefile']}":
        F.add("USF-ENTERPRISE-023", "Makefile#sonarqube-assurance-proof", "SonarQube proof Make target is missing")
    if "\nsonar-zero-issue-proof:" not in f"\n{state['makefile']}":
        F.add("USF-ENTERPRISE-023", "Makefile#sonar-zero-issue-proof", "SonarQube zero-issue proof Make target is missing")
    proof_source = (ROOT / "packages/proof/src/sonarqube-composed-proof.ts").read_text(encoding="utf-8")
    adapter_source = (ROOT / "adapters/assurance/src/index.ts").read_text(encoding="utf-8")
    for marker in (
        "@sonar/scan",
        "bounded-exponential-backoff-240s",
        "structuredLogEvidenceCaptured",
        "traceEvidenceCaptured",
        "metricEvidenceCaptured",
        "auditEvidenceCaptured",
        "redactionChecked",
        "suppressScannerOutput",
        "credentialRevocationChecked",
        "projectDeletionChecked",
        "supportedScanScope",
        "zeroOpenIssueQualityGateChecked",
        "zeroOpenIssueRequirementEnforced",
        "qualityGatePolicyAdministrationClaim",
        "vulnerabilityClearanceClaim",
    ):
        if marker not in adapter_source:
            F.add("USF-ENTERPRISE-023", "adapters/assurance/src/index.ts", f"adapter marker is missing: {marker}")
    for marker in (
        "COMPOSE_PROFILE = \"assurance\"",
        "allocateFetchSafeLoopbackPort",
        "assertFetchSafeLoopbackPort",
        "host_ip: 127.0.0.1",
        "composeDown",
        "--remove-orphans",
        "-v",
        "assertSafeEvidence",
        "proof:assurance:sonarqube",
        "zeroOpenIssueQualityGateChecked",
        'unresolvedIssueCountBucket === "zero"',
        'securityHotspotCountBucket === "zero"',
    ):
        if marker not in proof_source:
            F.add("USF-ENTERPRISE-023", "packages/proof/src/sonarqube-composed-proof.ts", f"proof marker is missing: {marker}")

    zero_issue = state.get("sonarqubeZeroIssueAssurance")
    if not isinstance(zero_issue, dict):
        F.add(
            "USF-ENTERPRISE-023",
            str(SONARQUBE_ZERO_ISSUE_ASSURANCE_PATH),
            "SonarQube zero-issue assurance artefact is missing",
        )
    else:
        expected_zero_top = {
            "issueId": "USF-233",
            "parentIssue": "USF-133",
            "status": "profile-gated-bounded-local-compose-proof",
            "serviceCatalogueAuthority": f"{SERVICE_CATALOGUE_PATH}#sonarqube",
            "proofBoundary": str(SONARQUBE_PROOF_BOUNDARY_PATH),
            "staticAnalysisDispositionMatrix": str(STATIC_ANALYSIS_MATRIX_PATH),
            "enterpriseEvidenceModel": str(MODEL_PATH),
            "supportedScanScope": "local-synthetic-typescript-project",
        }
        for key, expected in expected_zero_top.items():
            if zero_issue.get(key) != expected:
                F.add("USF-ENTERPRISE-023", f"zeroIssueAssurance.{key}", f"expected {expected!r}")
        if "USF-204" not in set(zero_issue.get("predecessorIssues", [])):
            F.add("USF-ENTERPRISE-023", "zeroIssueAssurance.predecessorIssues", "USF-204 predecessor is required")
        requirement = zero_issue.get("qualityGateRequirement", {})
        expected_requirement = {
            "enforcedByProof": True,
            "qualityGateStatusRequired": "OK",
            "unresolvedIssueCountRequired": 0,
            "securityHotspotCountRequired": 0,
            "scope": "supported-local-synthetic-scan-scope",
            "policyAdministrationClaim": False,
            "vulnerabilityClearanceClaim": False,
            "serviceReadinessClaim": False,
        }
        for key, expected in expected_requirement.items():
            observed = requirement.get(key) if isinstance(requirement, dict) else None
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-ENTERPRISE-023", f"zeroIssueAssurance.qualityGateRequirement.{key}", f"expected {expected!r}")
        proof = zero_issue.get("proofEvidence", {})
        expected_proof = {
            "proofCommand": "corepack pnpm proof:assurance:sonarqube",
            "makeTarget": "sonar-zero-issue-proof",
            "compatibilityMakeTarget": "sonarqube-assurance-proof",
            "packageScript": "proof:assurance:sonarqube",
            "sdkPackage": "@sonar/scan",
            "sdkVersion": "4.3.8",
        }
        for key, expected in expected_proof.items():
            if not isinstance(proof, dict) or proof.get(key) != expected:
                F.add("USF-ENTERPRISE-023", f"zeroIssueAssurance.proofEvidence.{key}", f"expected {expected!r}")
        required_fields = {
            "zeroOpenIssueQualityGateChecked",
            "zeroOpenIssueRequirement",
            "zeroOpenIssueRequirementEnforced",
            "qualityGatePolicyAdministrationClaim",
            "vulnerabilityClearanceClaim",
        }
        if required_fields - set(proof.get("requiredEvidenceFields", []) if isinstance(proof, dict) else []):
            F.add("USF-ENTERPRISE-023", "zeroIssueAssurance.proofEvidence.requiredEvidenceFields", "zero-issue evidence fields are incomplete")
        boundaries = zero_issue.get("exclusionsAndBoundaries", {})
        if not isinstance(boundaries, dict) or not boundaries.get("justification"):
            F.add("USF-ENTERPRISE-023", "zeroIssueAssurance.exclusionsAndBoundaries.justification", "zero-issue exclusions must be justified")
        if len(boundaries.get("excludedFromZeroIssueClaim", []) if isinstance(boundaries, dict) else []) < 6:
            F.add("USF-ENTERPRISE-023", "zeroIssueAssurance.exclusionsAndBoundaries.excludedFromZeroIssueClaim", "zero-issue exclusions are incomplete")
        if REQUIRED_NON_CLAIMS - set(zero_issue.get("nonClaims", [])):
            F.add("USF-ENTERPRISE-023", "zeroIssueAssurance.nonClaims", "zero-issue non-claims are incomplete")
        if {
            "sonarqube-readiness",
            "quality-gate-readiness",
            "repository-wide-zero-issue-readiness",
            "vulnerability-clearance-readiness",
        } - set(zero_issue.get("readinessClaimsProhibited", [])):
            F.add("USF-ENTERPRISE-023", "zeroIssueAssurance.readinessClaimsProhibited", "zero-issue prohibited claims are incomplete")

    declared_evidence = set(boundary.get("enterpriseEvidenceRefs", []))
    required_evidence = set().union(*SONARQUBE_BOUNDARY_REQUIRED_EVIDENCE_ROWS.values())
    if declared_evidence != required_evidence:
        F.add("USF-ENTERPRISE-023", "enterpriseEvidenceRefs", "SonarQube boundary enterprise evidence refs are incomplete")

    closure_rows = {
        row.get("service_id"): row.get("closure_evidence", {})
        for row in (state.get("closureMatrix") or {}).get("rows", [])
        if isinstance(row, dict)
    }
    for service_id in SONARQUBE_BOUNDARY_REQUIRED_SERVICES:
        evidence = closure_rows.get(service_id)
        if not evidence:
            F.add("USF-ENTERPRISE-023", f"closureMatrix.{service_id}", "SonarQube service closure row is missing")
            continue
        if service_id in {"sonarqube", "sonar-postgres"}:
            if (
                evidence.get("closure_disposition") != "profile-gated-bounded-proof"
                or evidence.get("closure_blocking") is not False
            ):
                F.add(
                    "USF-ENTERPRISE-023",
                    f"closureMatrix.{service_id}",
                    "SonarQube service row must record bounded profile-gated proof",
                )
            for required_ref in (
                "corepack pnpm proof:assurance:sonarqube",
                "usf-204-evidence-sonarqube-composed-proof",
            ):
                if required_ref not in set(evidence.get("proof_evidence_refs", [])):
                    F.add("USF-ENTERPRISE-023", f"closureMatrix.{service_id}.proof_evidence_refs", f"missing {required_ref}")
            if "usf-204-evidence-sonarqube-composed-proof" not in set(evidence.get("enterprise_evidence_refs", [])):
                F.add("USF-ENTERPRISE-023", f"closureMatrix.{service_id}.enterprise_evidence_refs", "USF-204 evidence ref is required")
        else:
            if evidence.get("closure_disposition") != "deferred" or evidence.get("closure_blocking") is not True:
                F.add(
                    "USF-ENTERPRISE-023",
                    f"closureMatrix.{service_id}",
                    "sonar-oidc-plugin row must remain deferred and closure-blocking",
                )
        if not {"USF-195", "USF-204"}.issubset(set(evidence.get("tracking_issues", []))):
            F.add("USF-ENTERPRISE-023", f"closureMatrix.{service_id}.tracking_issues", "SonarQube service row must link USF-195 and USF-204")
        if STATIC_ANALYSIS_PROHIBITED_CLAIMS - set(evidence.get("readiness_claims_prohibited", [])):
            F.add("USF-ENTERPRISE-023", f"closureMatrix.{service_id}.readiness_claims_prohibited", "SonarQube closure row prohibited claims are incomplete")

    static_matrix = state.get("staticAnalysisMatrix") or {}
    if static_matrix.get("remainingProofIssue") != "USF-169":
        F.add("USF-ENTERPRISE-023", "staticAnalysisMatrix.remainingProofIssue", "static analysis matrix must carry USF-169 as remaining proof")
    if static_matrix.get("resolvedProofIssue") != "USF-204":
        F.add("USF-ENTERPRISE-023", "staticAnalysisMatrix.resolvedProofIssue", "static analysis matrix must record USF-204 as resolved proof")
    if {"USF-204", "USF-169", "USF-193"} - set(static_matrix.get("issueLinks", [])):
        F.add("USF-ENTERPRISE-023", "staticAnalysisMatrix.issueLinks", "static analysis matrix must link USF-204, USF-169, and USF-193")

    model = state["model"]
    for section, row_ids in SONARQUBE_BOUNDARY_REQUIRED_EVIDENCE_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in row_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-023", row_id, f"missing SonarQube enterprise row in {section}")
                continue
            row_text = json.dumps(row, sort_keys=True)
            if missing_required_non_claims(row):
                F.add("USF-ENTERPRISE-023", row_id, "SonarQube enterprise row non-claims are incomplete")
            if "USF-204" in row_id and "USF-204" not in row_text:
                F.add("USF-ENTERPRISE-023", row_id, "USF-204 enterprise row lacks issue linkage")
            if "usf-195" in row_id and "USF-195" not in row_text:
                F.add("USF-ENTERPRISE-023", row_id, "USF-195 enterprise row lacks issue linkage")
            if section not in {"threatModelAbuseCaseRegister", "sdkDependencyGovernance"} and not row.get("validationCommand"):
                F.add("USF-ENTERPRISE-023", row_id, "SonarQube enterprise row lacks validation command")
            if section == "evidenceRegister":
                expected_issues = {"USF-195", "USF-204", "USF-171", "USF-187", "USF-184", "USF-192", "USF-133"}
                for issue in expected_issues:
                    if issue not in row.get("issueLinks", []):
                        F.add("USF-ENTERPRISE-023", row_id, f"evidence row lacks {issue}")
                if "not prove" not in str(row.get("whatWasNotProven", "")).lower():
                    F.add("USF-ENTERPRISE-023", row_id, "evidence row must preserve explicit non-proof boundary")
                if "USF-204" in row_id and row.get("validationCommand") != "corepack pnpm proof:assurance:sonarqube":
                    F.add("USF-ENTERPRISE-023", row_id, "USF-204 evidence row must pin SonarQube proof command")
            if section == "sdkDependencyGovernance":
                expected_sdk = {
                    "packageName": "@sonar/scan",
                    "version": "4.3.8",
                    "officialOrDeFactoStatus": "official-sonarsource-npm-scanner",
                    "providerId": "quality-gate-sonarqube-composed-test",
                }
                for key, expected in expected_sdk.items():
                    if row.get(key) != expected:
                        F.add("USF-ENTERPRISE-023", f"{row_id}.{key}", f"expected {expected!r}")
                for field in (
                    "selectionRationale",
                    "licencePosture",
                    "maintenancePosture",
                    "securityAdvisoryPosture",
                    "typescriptRuntimeCompatibility",
                    "forbiddenLayerImportCheck",
                    "updateDeprecationOwner",
                ):
                    if not row.get(field):
                        F.add("USF-ENTERPRISE-023", f"{row_id}.{field}", "SDK governance field is required")


def check_sentry_error_monitoring_disposition(F: Findings, state: dict[str, Any]) -> None:
    matrix = state.get("sentryErrorMatrix")
    if not isinstance(matrix, dict):
        F.add("USF-ENTERPRISE-022", str(SENTRY_ERROR_MATRIX_PATH), "Sentry error-monitoring disposition matrix is missing")
        return

    expected_top = {
        "sourceIssue": "USF-170",
        "followUpIssue": "USF-196",
        "laneIssue": "USF-187",
        "parentIssue": "USF-133",
        "serviceId": "sentry",
        "serviceCatalogueAuthority": str(SERVICE_CATALOGUE_PATH),
        "closureMatrix": str(CLOSURE_MATRIX_PATH),
        "enterpriseEvidenceModel": str(MODEL_PATH),
        "validationCommand": "python3 tools/validate-enterprise/validate-enterprise.py all --json",
    }
    for key, expected in expected_top.items():
        if matrix.get(key) != expected:
            F.add("USF-ENTERPRISE-022", key, f"expected {expected!r}")

    if SENTRY_ERROR_REQUIRED_ISSUES - set(matrix.get("issueLinks", [])):
        F.add("USF-ENTERPRISE-022", "issueLinks", "Sentry matrix issue links are incomplete")
    if REQUIRED_NON_CLAIMS - set(matrix.get("nonClaims", [])):
        F.add("USF-ENTERPRISE-022", "nonClaims", "Sentry matrix non-claims are incomplete")
    if REQUIRED_NON_CLAIMS & set(matrix.get("readinessClaimsAllowed", [])):
        F.add("USF-ENTERPRISE-022", "readinessClaimsAllowed", "Sentry matrix allows a prohibited readiness claim")
    if SENTRY_ERROR_PROHIBITED_CLAIMS - set(matrix.get("readinessClaimsProhibited", [])):
        F.add("USF-ENTERPRISE-022", "readinessClaimsProhibited", "Sentry prohibited claims are incomplete")

    decision = matrix.get("humanDecision", {})
    if not isinstance(decision, dict) or decision.get("decisionState") != "accepted":
        F.add("USF-ENTERPRISE-022", "humanDecision", "accepted human decision must be recorded")
    elif decision.get("decisionIsWorkComplete") is not False:
        F.add("USF-ENTERPRISE-022", "humanDecision.decisionIsWorkComplete", "decision must not mean work complete")

    disposition = matrix.get("sentryDisposition", {})
    if not isinstance(disposition, dict):
        F.add("USF-ENTERPRISE-022", "sentryDisposition", "Sentry disposition must be an object")
    else:
        expected_disposition = {
            "disposition": "explicit-deferral-with-owner",
            "serviceSemanticProofPresent": False,
            "serviceReadinessClaim": False,
            "liveMonitoringReadinessClaim": False,
            "serviceCatalogueServiceId": "sentry",
            "followUpIssue": "USF-196",
            "owner": "platform-observability-foundation",
            "riskOwner": "platform-observability-risk-owner",
            "controlOwner": "platform-observability-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_disposition.items():
            observed = disposition.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-ENTERPRISE-022", f"sentryDisposition.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "deferredEvidence"):
            if disposition.get(field) in (None, "", []):
                F.add("USF-ENTERPRISE-022", f"sentryDisposition.{field}", "Sentry deferral field is required")

    local_gate = matrix.get("localErrorEvidenceGate", {})
    if not isinstance(local_gate, dict):
        F.add("USF-ENTERPRISE-022", "localErrorEvidenceGate", "local error evidence gate must be an object")
    else:
        if local_gate.get("usedAsSubstituteForLocalObservabilityChecks") is not True:
            F.add("USF-ENTERPRISE-022", "localErrorEvidenceGate.usedAsSubstituteForLocalObservabilityChecks", "local observability substitution must be explicit")
        if local_gate.get("sentryServiceEquivalent") is not False:
            F.add("USF-ENTERPRISE-022", "localErrorEvidenceGate.sentryServiceEquivalent", "local checks must not be Sentry service equivalent")
        commands = set(local_gate.get("commands", []))
        for command in (
            "corepack pnpm verify",
            "corepack pnpm parity",
            "python3 tools/validate-enterprise/validate-enterprise.py all --json",
        ):
            if command not in commands:
                F.add("USF-ENTERPRISE-022", "localErrorEvidenceGate.commands", f"missing {command}")
        if not local_gate.get("substitutionNonEquivalenceBoundary"):
            F.add("USF-ENTERPRISE-022", "localErrorEvidenceGate.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
        if len(local_gate.get("scopeCovered", [])) < 6 or len(local_gate.get("limits", [])) < 6:
            F.add("USF-ENTERPRISE-022", "localErrorEvidenceGate", "verification scope and limits are incomplete")

    incident = matrix.get("incidentAlertingPosture", {})
    if not isinstance(incident, dict):
        F.add("USF-ENTERPRISE-022", "incidentAlertingPosture", "incident and alerting posture must be an object")
    else:
        for key in ("sentryReadinessClaim", "liveMonitoringReadinessClaim", "incidentReadinessClaim", "alertingReadinessClaim"):
            if incident.get(key) is not False:
                F.add("USF-ENTERPRISE-022", f"incidentAlertingPosture.{key}", "Sentry readiness or incident claims must remain false")
        if incident.get("followUpIssue") != "USF-196":
            F.add("USF-ENTERPRISE-022", "incidentAlertingPosture.followUpIssue", "Sentry posture must link USF-196")

    boundary = matrix.get("operatorAccessAuditRetentionSupplierBoundary", {})
    if not isinstance(boundary, dict):
        F.add("USF-ENTERPRISE-022", "operatorAccessAuditRetentionSupplierBoundary", "operator/access boundary must be an object")
    else:
        for field in (
            "operatorAccessBoundary",
            "authRequirement",
            "auditRequirement",
            "retentionBoundary",
            "secretBoundary",
            "supplierBoundary",
            "incidentBoundary",
        ):
            if not boundary.get(field):
                F.add("USF-ENTERPRISE-022", f"operatorAccessAuditRetentionSupplierBoundary.{field}", "boundary field is required")

    declared_evidence = set(matrix.get("enterpriseEvidenceRefs", []))
    required_evidence = set().union(*SENTRY_ERROR_REQUIRED_EVIDENCE_ROWS.values())
    if declared_evidence != required_evidence:
        F.add("USF-ENTERPRISE-022", "enterpriseEvidenceRefs", "Sentry enterprise evidence refs are incomplete")

    model = state["model"]
    for section, row_ids in SENTRY_ERROR_REQUIRED_EVIDENCE_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in row_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-022", row_id, f"missing USF-170 enterprise row in {section}")
                continue
            row_text = json.dumps(row, sort_keys=True)
            if missing_required_non_claims(row):
                F.add("USF-ENTERPRISE-022", row_id, "USF-170 enterprise row non-claims are incomplete")
            if "USF-170" not in row_text or "USF-196" not in row_text or str(SENTRY_ERROR_MATRIX_PATH) not in row_text:
                F.add("USF-ENTERPRISE-022", row_id, "USF-170 enterprise row lacks issue, follow-up, or matrix linkage")
            if section != "threatModelAbuseCaseRegister" and not row.get("validationCommand"):
                F.add("USF-ENTERPRISE-022", row_id, "USF-170 enterprise row lacks validation command")
            if section == "evidenceRegister":
                for issue in SENTRY_ERROR_REQUIRED_ISSUES:
                    if issue not in row.get("issueLinks", []):
                        F.add("USF-ENTERPRISE-022", row_id, f"evidence row lacks {issue}")
                if "not prove" not in str(row.get("whatWasNotProven", "")).lower():
                    F.add("USF-ENTERPRISE-022", row_id, "evidence row must preserve explicit non-proof boundary")

    assurance_text = json.dumps(model, sort_keys=True)
    for stale in ("until USF-170 closes", "followUpIssue=USF-170"):
        if stale in assurance_text:
            F.add("USF-ENTERPRISE-022", "enterprise-evidence-stale-self-deferral", f"stale self-deferral remains: {stale}")


def check_sentry_service_proof_boundary(F: Findings, state: dict[str, Any]) -> None:
    boundary = state.get("sentryProofBoundary")
    if not isinstance(boundary, dict):
        F.add("USF-ENTERPRISE-024", str(SENTRY_PROOF_BOUNDARY_PATH), "Sentry proof boundary is missing")
        return

    expected_top = {
        "sourceIssue": "USF-205",
        "predecessorIssue": "USF-196",
        "followUpIssue": "USF-218",
        "sourceDispositionIssue": "USF-170",
        "laneIssue": "USF-187",
        "parentIssue": "USF-133",
        "status": "accepted-sdk-envelope-proof-service-readiness-deferred",
        "serviceCatalogueAuthority": str(SERVICE_CATALOGUE_PATH),
        "closureMatrix": str(CLOSURE_MATRIX_PATH),
        "sentryErrorMonitoringDispositionMatrix": str(SENTRY_ERROR_MATRIX_PATH),
        "enterpriseEvidenceModel": str(MODEL_PATH),
        "validationCommand": "corepack pnpm proof:observability:sentry",
    }
    for key, expected in expected_top.items():
        if boundary.get(key) != expected:
            F.add("USF-ENTERPRISE-024", key, f"expected {expected!r}")

    if set(boundary.get("serviceIds", [])) != SENTRY_BOUNDARY_REQUIRED_SERVICES:
        F.add("USF-ENTERPRISE-024", "serviceIds", "Sentry boundary service ids are incomplete")
    if len(boundary.get("reactServiceIds", [])) < 10:
        F.add("USF-ENTERPRISE-024", "reactServiceIds", "Sentry boundary must list React Sentry service cluster rows")
    if SENTRY_BOUNDARY_REQUIRED_ISSUES - set(boundary.get("issueLinks", [])):
        F.add("USF-ENTERPRISE-024", "issueLinks", "Sentry boundary issue links are incomplete")
    if REQUIRED_NON_CLAIMS - set(boundary.get("nonClaims", [])):
        F.add("USF-ENTERPRISE-024", "nonClaims", "Sentry boundary non-claims are incomplete")
    if SENTRY_BOUNDARY_PROHIBITED_CLAIMS - set(boundary.get("readinessClaimsProhibited", [])):
        F.add("USF-ENTERPRISE-024", "readinessClaimsProhibited", "Sentry boundary prohibited claims are incomplete")
    if SENTRY_BOUNDARY_PROHIBITED_CLAIMS & set(boundary.get("readinessClaimsAllowed", [])):
        F.add("USF-ENTERPRISE-024", "readinessClaimsAllowed", "Sentry boundary allows a prohibited readiness claim")

    reclassification = boundary.get("reclassification", {})
    if not isinstance(reclassification, dict):
        F.add("USF-ENTERPRISE-024", "reclassification", "Sentry reclassification must be an object")
    else:
        expected_reclassification = {
            "from": "requires-human-decision",
            "to": "accepted-sdk-envelope-proof-service-readiness-deferred",
            "decisionAcceptedDoesNotMeanWorkComplete": True,
            "serviceSemanticProofImplemented": False,
            "acceptedSdkEnvelopeProofImplemented": True,
            "sentryServiceReadinessClaim": False,
            "liveMonitoringReadinessClaim": False,
            "incidentReadinessClaim": False,
            "alertingReadinessClaim": False,
            "localObservabilityEquivalentToSentryService": False,
        }
        for key, expected in expected_reclassification.items():
            observed = reclassification.get(key)
            if observed is not expected if isinstance(expected, bool) else observed != expected:
                F.add("USF-ENTERPRISE-024", f"reclassification.{key}", f"expected {expected!r}")
        if len(reclassification.get("repositoryEvidence", [])) < 5:
            F.add("USF-ENTERPRISE-024", "reclassification.repositoryEvidence", "repository evidence refs are incomplete")

    remaining = boundary.get("remainingProofBoundary", {})
    if not isinstance(remaining, dict):
        F.add("USF-ENTERPRISE-024", "remainingProofBoundary", "remaining proof boundary must be an object")
    else:
        expected_remaining = {
            "issue": "USF-222",
            "owner": "platform-observability-foundation",
            "riskOwner": "platform-observability-risk-owner",
            "controlOwner": "platform-observability-control-owner",
            "reviewDate": "2026-09-30",
        }
        for key, expected in expected_remaining.items():
            if remaining.get(key) != expected:
                F.add("USF-ENTERPRISE-024", f"remainingProofBoundary.{key}", f"expected {expected!r}")
        for field in ("riskStatement", "treatment", "requiredEvidence"):
            if remaining.get(field) in (None, "", []):
                F.add("USF-ENTERPRISE-024", f"remainingProofBoundary.{field}", "remaining proof field is required")
        if len(remaining.get("requiredEvidence", [])) < 6:
            F.add("USF-ENTERPRISE-024", "remainingProofBoundary.requiredEvidence", "remaining proof evidence list is incomplete")

    event_boundary = boundary.get("eventMonitoringBoundary", {})
    for field in (
        "eventCaptureStatus",
        "redactionStatus",
        "tenantSafeLabelStatus",
        "retentionStatus",
    ):
        if event_boundary.get(field) != "accepted-sdk-envelope-proof":
            F.add(
                "USF-ENTERPRISE-024",
                f"eventMonitoringBoundary.{field}",
                "event monitoring boundary must record accepted SDK-envelope proof",
            )
    for field in ("alertHandoffStatus", "incidentEvidenceStatus"):
        if event_boundary.get(field) != "deferred-with-owner-review-date":
            F.add(
                "USF-ENTERPRISE-024",
                f"eventMonitoringBoundary.{field}",
                "alert and incident boundaries must remain deferred with owner review date",
            )
    for field in ("owner", "riskOwner", "controlOwner", "reviewDate"):
        if not event_boundary.get(field):
            F.add("USF-ENTERPRISE-024", f"eventMonitoringBoundary.{field}", "event monitoring owner metadata is required")

    operator = boundary.get("operatorAccessAuditRetentionSupplierBoundary", {})
    for field in (
        "operatorAccessBoundary",
        "authRequirement",
        "auditRequirement",
        "retentionBoundary",
        "secretBoundary",
        "supplierBoundary",
        "incidentBoundary",
    ):
        if not operator.get(field):
            F.add("USF-ENTERPRISE-024", f"operatorAccessAuditRetentionSupplierBoundary.{field}", "operator boundary field is required")

    local_gate = boundary.get("localObservabilityGate", {})
    if local_gate.get("repositoryValidationRequired") is not True:
        F.add("USF-ENTERPRISE-024", "localObservabilityGate.repositoryValidationRequired", "repository validation must remain required")
    if local_gate.get("sentryServiceEquivalent") is not False:
        F.add("USF-ENTERPRISE-024", "localObservabilityGate.sentryServiceEquivalent", "local observability proof must not be Sentry service equivalent")
    if not local_gate.get("substitutionNonEquivalenceBoundary"):
        F.add("USF-ENTERPRISE-024", "localObservabilityGate.substitutionNonEquivalenceBoundary", "non-equivalence boundary is required")
    if "python3 tools/validate-enterprise/validate-enterprise.py all --json" not in set(local_gate.get("commands", [])):
        F.add("USF-ENTERPRISE-024", "localObservabilityGate.commands", "enterprise validation command is required")
    if "corepack pnpm proof:observability:sentry" not in set(local_gate.get("commands", [])):
        F.add("USF-ENTERPRISE-024", "localObservabilityGate.commands", "Sentry SDK-envelope proof command is required")

    sdk_proof = boundary.get("acceptedSdkEnvelopeProof", {})
    if not isinstance(sdk_proof, dict):
        F.add("USF-ENTERPRISE-024", "acceptedSdkEnvelopeProof", "accepted Sentry SDK-envelope proof metadata is required")
    else:
        expected_sdk_proof = {
            "issue": "USF-205",
            "proofCommand": "corepack pnpm proof:observability:sentry",
            "packageScript": "proof:observability:sentry",
            "makeTarget": "sentry-observability-proof",
            "adapterPath": "adapters/obs/src/index.ts#SentrySdkEnvelopeProofAdapter",
            "proofPath": "packages/proof/src/sentry-sdk-envelope-proof.ts",
            "providerRegistryId": "observability-sentry-sdk-envelope-local",
            "adapterName": "SentrySdkEnvelopeProofAdapter",
            "sdkPackage": "@sentry/node",
            "sdkVersion": "10.62.0",
            "officialOrDeFactoStatus": "official-sentry-node-sdk",
            "providerMode": "local-test",
            "serviceCatalogueServiceId": "sentry",
            "serviceReadinessStatus": "deferred-no-generated-compose-target",
            "eventIngestionStatus": "sdk-envelope-captured-local-transport-not-service-ingestion",
            "tenantLabelStatus": "opaque-hash-only",
            "failClosedStatus": "unavailable-transport-path-exercised",
        }
        for key, expected in expected_sdk_proof.items():
            if sdk_proof.get(key) != expected:
                F.add("USF-ENTERPRISE-024", f"acceptedSdkEnvelopeProof.{key}", f"expected {expected!r}")
        safe_output = str(sdk_proof.get("safeOutputBoundary", "")).lower()
        if "value-free" not in safe_output or "no raw endpoint" not in safe_output or "tenant identifier" not in safe_output:
            F.add(
                "USF-ENTERPRISE-024",
                "acceptedSdkEnvelopeProof.safeOutputBoundary",
                "safe output boundary must explicitly prohibit raw and tenant-identifying evidence",
            )

    package = state.get("package") or {}
    scripts = package.get("scripts") if isinstance(package, dict) else {}
    if not isinstance(scripts, dict) or scripts.get("proof:observability:sentry") != "tsx packages/proof/src/sentry-sdk-envelope-proof.ts":
        F.add("USF-ENTERPRISE-024", "package.json#proof:observability:sentry", "Sentry proof package script is missing or stale")
    if isinstance(scripts, dict) and "proof:observability:sentry" not in str(scripts.get("verify", "")):
        F.add("USF-ENTERPRISE-024", "package.json#verify", "verify must run Sentry proof")
    if package.get("dependencies", {}).get("@sentry/node") != "10.62.0":
        F.add("USF-ENTERPRISE-024", "package.json#@sentry/node", "Sentry SDK dependency must be exact-version pinned")
    if "\nsentry-observability-proof:" not in f"\n{state['makefile']}":
        F.add("USF-ENTERPRISE-024", "Makefile#sentry-observability-proof", "Sentry proof Make target is missing")
    proof_source = (ROOT / "packages/proof/src/sentry-sdk-envelope-proof.ts").read_text(encoding="utf-8")
    adapter_source = (ROOT / "adapters/obs/src/index.ts").read_text(encoding="utf-8")
    provider_registry_source = (ROOT / "packages/core/src/index.ts").read_text(encoding="utf-8")
    for marker in (
        "@sentry/node",
        "SentrySdkEnvelopeProofAdapter",
        "beforeSend",
        "createTransport",
        "eventCaptureChecked",
        "redactionChecked",
        "tenantSafeLabelChecked",
        "sentry-sdk-envelope-fail-closed",
        "deferred-no-generated-compose-target",
        "sdk-envelope-captured-local-transport-not-service-ingestion",
        "local-sdk-envelope-proof-is-not-sentry-service-readiness",
    ):
        if marker not in adapter_source:
            F.add("USF-ENTERPRISE-024", "adapters/obs/src/index.ts", f"adapter marker is missing: {marker}")
    for marker in (
        "SentrySdkEnvelopeProofAdapter",
        "FORBIDDEN_SAFE_OUTPUT_RE",
        "proof:observability:sentry",
        "serviceReadinessStatus",
        "sentry-readiness-not-claimed",
        "usf-133-closure-not-claimed",
        "unavailableProviderResult",
    ):
        if marker not in proof_source:
            F.add("USF-ENTERPRISE-024", "packages/proof/src/sentry-sdk-envelope-proof.ts", f"proof marker is missing: {marker}")
    for marker in (
        "observability-sentry-sdk-envelope-local",
        "SentrySdkEnvelopeProofAdapter",
        "endpoint://not-generated/sentry-sdk-envelope-proof",
        "not-applicable-local-in-memory-transport",
        "fail-closed-on-unavailable-transport",
    ):
        if marker not in provider_registry_source:
            F.add("USF-ENTERPRISE-024", "packages/core/src/index.ts", f"provider registry marker is missing: {marker}")

    declared_evidence = set(boundary.get("enterpriseEvidenceRefs", []))
    required_evidence = set().union(*SENTRY_BOUNDARY_REQUIRED_EVIDENCE_ROWS.values())
    if declared_evidence != required_evidence:
        F.add("USF-ENTERPRISE-024", "enterpriseEvidenceRefs", "Sentry boundary enterprise evidence refs are incomplete")

    closure_rows = {
        row.get("service_id"): row.get("closure_evidence", {})
        for row in (state.get("closureMatrix") or {}).get("rows", [])
        if isinstance(row, dict)
    }
    evidence = closure_rows.get("sentry")
    if not evidence:
        F.add("USF-ENTERPRISE-024", "closureMatrix.sentry", "Sentry service closure row is missing")
    else:
        if evidence.get("closure_disposition") != "deferred" or evidence.get("closure_blocking") is not True:
            F.add("USF-ENTERPRISE-024", "closureMatrix.sentry", "Sentry service row must remain deferred and closure-blocking")
        if not {"USF-196", "USF-205", "USF-218", "USF-222"}.issubset(set(evidence.get("tracking_issues", []))):
            F.add("USF-ENTERPRISE-024", "closureMatrix.sentry.tracking_issues", "Sentry service row must link USF-196, USF-205, USF-218, and USF-222")
        for required_ref in (
            "corepack pnpm proof:observability:sentry",
            "packages/proof/src/sentry-sdk-envelope-proof.ts",
            "usf-205-evidence-sentry-sdk-envelope-proof",
        ):
            if required_ref not in set(evidence.get("proof_evidence_refs", [])):
                F.add("USF-ENTERPRISE-024", "closureMatrix.sentry.proof_evidence_refs", f"missing {required_ref}")
        if "usf-205-evidence-sentry-sdk-envelope-proof" not in set(evidence.get("enterprise_evidence_refs", [])):
            F.add("USF-ENTERPRISE-024", "closureMatrix.sentry.enterprise_evidence_refs", "USF-205 evidence ref is required")
        if SENTRY_ERROR_PROHIBITED_CLAIMS - set(evidence.get("readiness_claims_prohibited", [])):
            F.add("USF-ENTERPRISE-024", "closureMatrix.sentry.readiness_claims_prohibited", "Sentry closure row prohibited claims are incomplete")

    sentry_matrix = state.get("sentryErrorMatrix") or {}
    if sentry_matrix.get("remainingProofIssue") != "USF-218":
        F.add("USF-ENTERPRISE-024", "sentryErrorMatrix.remainingProofIssue", "Sentry matrix must carry USF-218 as current bounded proof-depth issue")
    if sentry_matrix.get("executionProofFollowUpIssue") != "USF-222":
        F.add("USF-ENTERPRISE-024", "sentryErrorMatrix.executionProofFollowUpIssue", "Sentry matrix must carry USF-222 as execution proof follow-up")
    if sentry_matrix.get("sentryDisposition", {}).get("resolvedProofIssue") != "USF-205":
        F.add("USF-ENTERPRISE-024", "sentryDisposition.resolvedProofIssue", "Sentry matrix must record USF-205 as resolved proof")
    if {"USF-205", "USF-218", "USF-222", "USF-159", "USF-169", "USF-193"} - set(sentry_matrix.get("issueLinks", [])):
        F.add("USF-ENTERPRISE-024", "sentryErrorMatrix.issueLinks", "Sentry matrix must link USF-205, USF-218, USF-222, USF-159, USF-169, and USF-193")

    model = state["model"]
    for section, row_ids in SENTRY_BOUNDARY_REQUIRED_EVIDENCE_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in row_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-024", row_id, f"missing Sentry enterprise row in {section}")
                continue
            row_text = json.dumps(row, sort_keys=True)
            if missing_required_non_claims(row):
                F.add("USF-ENTERPRISE-024", row_id, "Sentry enterprise row non-claims are incomplete")
            if "USF-205" in row_id and "USF-205" not in row_text:
                F.add("USF-ENTERPRISE-024", row_id, "USF-205 enterprise row lacks issue linkage")
            if "usf-196" in row_id and "USF-196" not in row_text:
                F.add("USF-ENTERPRISE-024", row_id, "USF-196 enterprise row lacks issue linkage")
            if section != "sdkDependencyGovernance" and str(SENTRY_PROOF_BOUNDARY_PATH) not in row_text:
                F.add("USF-ENTERPRISE-024", row_id, "Sentry enterprise row lacks boundary linkage")
            if section not in {"threatModelAbuseCaseRegister", "sdkDependencyGovernance"} and not row.get("validationCommand"):
                F.add("USF-ENTERPRISE-024", row_id, "Sentry enterprise row lacks validation command")
            if section == "evidenceRegister":
                expected_issues = SENTRY_BOUNDARY_REQUIRED_ISSUES
                if "USF-205" not in row_id:
                    expected_issues = {"USF-196", "USF-205", "USF-170", "USF-187", "USF-184", "USF-192", "USF-133"}
                for issue in expected_issues:
                    if issue not in row.get("issueLinks", []):
                        F.add("USF-ENTERPRISE-024", row_id, f"evidence row lacks {issue}")
                if "not prove" not in str(row.get("whatWasNotProven", "")).lower():
                    F.add("USF-ENTERPRISE-024", row_id, "evidence row must preserve explicit non-proof boundary")
                if "USF-205" in row_id and row.get("validationCommand") != "corepack pnpm proof:observability:sentry":
                    F.add("USF-ENTERPRISE-024", row_id, "USF-205 evidence row must pin Sentry proof command")
            if section == "sdkDependencyGovernance":
                expected_sdk = {
                    "packageName": "@sentry/node",
                    "version": "10.62.0",
                    "officialOrDeFactoStatus": "official-sentry-node-sdk",
                    "providerId": "observability-sentry-sdk-envelope-local",
                }
                for key, expected in expected_sdk.items():
                    if row.get(key) != expected:
                        F.add("USF-ENTERPRISE-024", f"{row_id}.{key}", f"expected {expected!r}")
                for field in (
                    "selectionRationale",
                    "licencePosture",
                    "maintenancePosture",
                    "securityAdvisoryPosture",
                    "typescriptRuntimeCompatibility",
                    "forbiddenLayerImportCheck",
                    "updateDeprecationOwner",
                ):
                    if not row.get(field):
                        F.add("USF-ENTERPRISE-024", f"{row_id}.{field}", "Sentry SDK governance field is required")


def check_observability_service_operations_depth(F: Findings, state: dict[str, Any]) -> None:
    depth = state.get("observabilityServiceDepth")
    if not isinstance(depth, dict):
        F.add("USF-ENTERPRISE-026", str(OBSERVABILITY_SERVICE_DEPTH_PATH), "USF-218 depth artefact is missing")
        return

    expected_top = {
        "sourceIssue": "USF-218",
        "followUpIssue": "USF-222",
        "parentIssue": "USF-133",
        "localOperationsProofIssue": "USF-159",
        "sentrySdkProofIssue": "USF-205",
        "sentryDispositionIssue": "USF-170",
        "sentryBoundaryIssue": "USF-196",
        "status": "bounded-disposition-recorded-execution-proof-deferred",
        "serviceCatalogueAuthority": str(SERVICE_CATALOGUE_PATH),
        "enterpriseEvidenceModel": str(MODEL_PATH),
    }
    for key, expected in expected_top.items():
        if depth.get(key) != expected:
            F.add("USF-ENTERPRISE-026", key, f"expected {expected!r}")
    for field in ("owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate"):
        if not depth.get(field):
            F.add("USF-ENTERPRISE-026", field, "owner, risk, control, and review metadata are required")
    if OBSERVABILITY_SERVICE_DEPTH_REQUIRED_ISSUES - set(depth.get("issueLinks", [])):
        F.add("USF-ENTERPRISE-026", "issueLinks", "USF-218 issue links are incomplete")
    if REQUIRED_NON_CLAIMS - set(depth.get("nonClaims", [])):
        F.add("USF-ENTERPRISE-026", "nonClaims", "USF-218 non-claims are incomplete")
    if not set(depth.get("validationCommands", [])):
        F.add("USF-ENTERPRISE-026", "validationCommands", "validation command linkage is required")

    claims = depth.get("claims", {})
    if not isinstance(claims, dict):
        F.add("USF-ENTERPRISE-026", "claims", "claims must be an object")
        claims = {}
    for key in ("boundedDispositionRecorded", "localOperationsProofAccepted", "sentrySdkEnvelopeProofAccepted"):
        if claims.get(key) is not True:
            F.add("USF-ENTERPRISE-026", f"claims.{key}", "bounded proof marker must be true")
    for key in (
        "sdkEnvelopeEquivalentToServiceReadiness",
        "localObservabilityEquivalentToLiveBackendReadiness",
        "sentryServiceReadinessClaim",
        "liveMonitoringReadinessClaim",
        "alertingReadinessClaim",
        "dashboardReadinessClaim",
        "incidentWorkflowReadinessClaim",
        "retentionPurgeReadinessClaim",
        "sliSloOperationalReadinessClaim",
        "crossTenantAggregateAnalyticsReadinessClaim",
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
            F.add("USF-ENTERPRISE-026", f"claims.{key}", "readiness or closure claim must remain false")

    if set(depth.get("enterpriseEvidenceRefs", [])) != set().union(*OBSERVABILITY_SERVICE_DEPTH_REQUIRED_EVIDENCE_ROWS.values()):
        F.add("USF-ENTERPRISE-026", "enterpriseEvidenceRefs", "USF-218 enterprise evidence refs are incomplete")

    boundaries = depth.get("boundaries", [])
    if not isinstance(boundaries, list):
        F.add("USF-ENTERPRISE-026", "boundaries", "boundaries must be a list")
        boundaries = []
    boundary_ids = {row.get("id") for row in boundaries if isinstance(row, dict)}
    for required in (
        "local-observability-operations-proof",
        "sentry-sdk-envelope-proof",
        "sentry-service-readiness",
        "alert-delivery-routing",
        "dashboard-runtime",
        "incident-workflow",
        "sli-slo-operation",
        "retention-purge-operation",
        "cross-tenant-aggregate-analytics",
        "live-provider-supplier",
    ):
        if required not in boundary_ids:
            F.add("USF-ENTERPRISE-026", "boundaries", f"missing boundary {required}")
    for row in boundaries:
        if not isinstance(row, dict):
            continue
        row_id = row.get("id", "boundary")
        status = row.get("status")
        if status == "deferred-with-owner":
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
                    F.add("USF-ENTERPRISE-026", row_id, f"deferred boundary missing {field}")
            if row.get("followUpIssue") != "USF-222":
                F.add("USF-ENTERPRISE-026", row_id, "deferred execution boundary must link USF-222")
        elif status == "proven-local":
            for field in ("proofCommand", "validationCommand", "evidenceRefs", "nonEquivalenceBoundary", "nonClaimBoundary"):
                if not row.get(field):
                    F.add("USF-ENTERPRISE-026", row_id, f"proven local boundary missing {field}")
        else:
            F.add("USF-ENTERPRISE-026", row_id, "boundary must be proven-local or deferred-with-owner")

    service_rows = rows_by_id(depth.get("serviceBindingDispositions"), "serviceId")
    if set(service_rows) != OBSERVABILITY_SERVICE_DEPTH_REQUIRED_SERVICES:
        F.add(
            "USF-ENTERPRISE-026",
            "serviceBindingDispositions",
            f"missing={sorted(OBSERVABILITY_SERVICE_DEPTH_REQUIRED_SERVICES - set(service_rows))} extra={sorted(set(service_rows) - OBSERVABILITY_SERVICE_DEPTH_REQUIRED_SERVICES)}",
        )
    for service_id, row in service_rows.items():
        if row.get("futureExecutionProofIssue") != "USF-222":
            F.add("USF-ENTERPRISE-026", service_id, "service disposition must link USF-222")
        if row.get("readinessClaimAllowed") is not False:
            F.add("USF-ENTERPRISE-026", service_id, "service disposition must deny readiness claims")
        if not row.get("nonEquivalenceBoundary"):
            F.add("USF-ENTERPRISE-026", service_id, "service disposition must record non-equivalence boundary")

    sentry_boundary = state.get("sentryProofBoundary") or {}
    if sentry_boundary.get("followUpIssue") != "USF-218":
        F.add("USF-ENTERPRISE-026", "sentryProofBoundary.followUpIssue", "Sentry boundary must hand off to USF-218")
    if (sentry_boundary.get("remainingProofBoundary") or {}).get("issue") != "USF-222":
        F.add("USF-ENTERPRISE-026", "sentryProofBoundary.remainingProofBoundary.issue", "Sentry execution proof must hand off to USF-222")
    if {"USF-218", "USF-222"} - set(sentry_boundary.get("issueLinks", [])):
        F.add("USF-ENTERPRISE-026", "sentryProofBoundary.issueLinks", "Sentry boundary must link USF-218 and USF-222")

    sentry_matrix = state.get("sentryErrorMatrix") or {}
    if sentry_matrix.get("remainingProofIssue") != "USF-218":
        F.add("USF-ENTERPRISE-026", "sentryErrorMatrix.remainingProofIssue", "Sentry disposition must point current proof-depth to USF-218")
    if sentry_matrix.get("executionProofFollowUpIssue") != "USF-222":
        F.add("USF-ENTERPRISE-026", "sentryErrorMatrix.executionProofFollowUpIssue", "Sentry disposition must link USF-222 execution proof")

    closure_rows = {
        row.get("service_id"): row.get("closure_evidence", {})
        for row in (state.get("closureMatrix") or {}).get("rows", [])
        if isinstance(row, dict)
    }
    for service_id in OBSERVABILITY_SERVICE_DEPTH_REQUIRED_SERVICES:
        evidence = closure_rows.get(service_id)
        if not isinstance(evidence, dict):
            F.add("USF-ENTERPRISE-026", f"closureMatrix.{service_id}", "observability service closure row is missing")
            continue
        if {"USF-218", "USF-222"} - set(evidence.get("tracking_issues", [])):
            F.add("USF-ENTERPRISE-026", f"closureMatrix.{service_id}", "closure row must link USF-218 and USF-222")
        if set().union(*OBSERVABILITY_SERVICE_DEPTH_REQUIRED_EVIDENCE_ROWS.values()) - set(evidence.get("enterprise_evidence_refs", [])):
            F.add("USF-ENTERPRISE-026", f"closureMatrix.{service_id}", "closure row lacks USF-218 enterprise evidence refs")

    gate = state.get("usf133ClosureTierGate") or {}
    service_refs = rows_by_id(gate.get("requiredServiceDispositionRefs"), "serviceId")
    exceptions = rows_by_id(gate.get("enterpriseExceptionRegister"), "id")
    for service_id in OBSERVABILITY_SERVICE_DEPTH_REQUIRED_SERVICES:
        source_refs = set((service_refs.get(service_id) or {}).get("sourceIssueRefs", []))
        if {"USF-218", "USF-222"} - source_refs:
            F.add("USF-ENTERPRISE-026", f"serviceRef.{service_id}", "closure-tier service ref must link USF-218 and USF-222")
    for service_id in ("alertmanager", "alloy", "sentry"):
        exception = exceptions.get(f"exception-service-{service_id}") or {}
        if exception.get("followUpIssue") != "USF-222":
            F.add("USF-ENTERPRISE-026", f"exception.{service_id}", "observability exception must defer execution proof to USF-222")

    model = state["model"]
    for section, row_ids in OBSERVABILITY_SERVICE_DEPTH_REQUIRED_EVIDENCE_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in row_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-026", row_id, f"missing USF-218 enterprise row in {section}")
                continue
            row_text = json.dumps(row, sort_keys=True)
            if missing_required_non_claims(row):
                F.add("USF-ENTERPRISE-026", row_id, "USF-218 enterprise row non-claims are incomplete")
            if "USF-218" not in row_text or "USF-222" not in row_text or str(OBSERVABILITY_SERVICE_DEPTH_PATH) not in row_text:
                F.add("USF-ENTERPRISE-026", row_id, "USF-218 row lacks issue, follow-up, or artefact linkage")
            if section != "threatModelAbuseCaseRegister" and not row.get("validationCommand"):
                F.add("USF-ENTERPRISE-026", row_id, "USF-218 row lacks validation command")
            if section == "evidenceRegister":
                for issue in OBSERVABILITY_SERVICE_DEPTH_REQUIRED_ISSUES:
                    if issue not in row.get("issueLinks", []):
                        F.add("USF-ENTERPRISE-026", row_id, f"evidence row lacks {issue}")
                negative = str(row.get("whatWasNotProven", "")).lower()
                if "not prove" not in negative and "no " not in negative:
                    F.add("USF-ENTERPRISE-026", row_id, "evidence row must preserve explicit non-proof boundary")

    source_text = json.dumps(depth, sort_keys=True).lower()
    for phrase in (
        "sentry service readiness is proven",
        "alerting readiness is proven",
        "dashboard readiness is proven",
        "incident workflow readiness is proven",
        "usf-133 closure is proven",
        "production readiness is proven",
        "live provider readiness is proven",
    ):
        if phrase in source_text:
            F.add("USF-ENTERPRISE-026", str(OBSERVABILITY_SERVICE_DEPTH_PATH), f"readiness overclaim present: {phrase}")


def check_observability_operations_execution_proof(F: Findings, state: dict[str, Any]) -> None:
    proof = state.get("observabilityOperationsExecutionProof")
    if not isinstance(proof, dict):
        F.add(
            "USF-ENTERPRISE-030",
            str(OBSERVABILITY_OPERATIONS_EXECUTION_PROOF_PATH),
            "USF-222 execution proof artefact is missing",
        )
        return

    expected_top = {
        "sourceIssue": "USF-222",
        "predecessorIssue": "USF-218",
        "parentIssue": "USF-133",
        "status": "bounded-local-execution-proof-recorded-provider-readiness-deferred",
        "serviceCatalogueAuthority": str(SERVICE_CATALOGUE_PATH),
        "enterpriseEvidenceModel": str(MODEL_PATH),
        "proofFile": str(OBSERVABILITY_OPERATIONS_EXECUTION_PROOF_SOURCE_PATH),
        "proofCommand": "corepack pnpm proof:observability:operations-execution",
        "providerMode": "hermetic-mock",
    }
    for key, expected in expected_top.items():
        if proof.get(key) != expected:
            F.add("USF-ENTERPRISE-030", f"{key}", f"expected {expected!r}")
    for field in ("owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate"):
        if not proof.get(field):
            F.add("USF-ENTERPRISE-030", field, "owner, risk, control, and review metadata are required")
    if OBSERVABILITY_OPERATIONS_EXECUTION_REQUIRED_ISSUES - set(proof.get("issueLinks", [])):
        F.add("USF-ENTERPRISE-030", "issueLinks", "USF-222 issue links are incomplete")
    if OBSERVABILITY_OPERATIONS_EXECUTION_PROHIBITED_CLAIMS - set(proof.get("nonClaims", [])):
        F.add("USF-ENTERPRISE-030", "nonClaims", "USF-222 non-claims are incomplete")
    expected_refs = set().union(*OBSERVABILITY_OPERATIONS_EXECUTION_REQUIRED_EVIDENCE_ROWS.values())
    if expected_refs - set(proof.get("enterpriseEvidenceRefs", [])):
        F.add("USF-ENTERPRISE-030", "enterpriseEvidenceRefs", "USF-222 enterprise evidence refs are incomplete")

    claims = proof.get("claims", {})
    if not isinstance(claims, dict):
        F.add("USF-ENTERPRISE-030", "claims", "claims must be an object")
        claims = {}
    for key in (
        "boundedLocalExecutionProofRecorded",
        "alertRoutingProofExecuted",
        "dashboardRuntimeModelExecuted",
        "incidentWorkflowProofExecuted",
        "sliSloOperationProofExecuted",
        "retentionPurgeProofExecuted",
        "crossTenantAggregateSafetyProofExecuted",
    ):
        if claims.get(key) is not True:
            F.add("USF-ENTERPRISE-030", f"claims.{key}", "execution marker must be true")
    for key in (
        "serviceReadinessClaim",
        "sentryServiceReadinessClaim",
        "liveMonitoringReadinessClaim",
        "alertingReadinessClaim",
        "dashboardReadinessClaim",
        "incidentResponseReadinessClaim",
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
            F.add("USF-ENTERPRISE-030", f"claims.{key}", "readiness or closure claim must remain false")

    evidence = proof.get("executionEvidence", {})
    if not isinstance(evidence, dict):
        F.add("USF-ENTERPRISE-030", "executionEvidence", "execution evidence must be an object")
        evidence = {}
    for key in (
        "alertRuleEvaluated",
        "alertRoutedToSyntheticReceiver",
        "alertRoutingAuditCaptured",
        "dashboardRuntimeRendered",
        "dashboardTenantBoundaryChecked",
        "incidentCreated",
        "incidentAcknowledged",
        "incidentCorrectiveActionRecorded",
        "incidentResolved",
        "sliCalculated",
        "sloEvaluated",
        "retentionPurgeExecuted",
        "retentionPurgeAuditCaptured",
        "crossTenantAggregateChecked",
        "crossTenantAggregateTenantNamesSuppressed",
        "tenantIsolationChecked",
        "auditEvidenceCaptured",
        "structuredLogEvidenceCaptured",
        "tracingEvidenceCaptured",
        "metricEvidenceCaptured",
        "redactionChecked",
        "syntheticDataChecked",
        "safeFailureChecked",
    ):
        if evidence.get(key) is not True:
            F.add("USF-ENTERPRISE-030", f"executionEvidence.{key}", "execution evidence marker must be true")

    service_rows = rows_by_id(proof.get("serviceBindingDispositions"), "serviceId")
    if set(service_rows) != OBSERVABILITY_SERVICE_DEPTH_REQUIRED_SERVICES:
        F.add("USF-ENTERPRISE-030", "serviceBindingDispositions", "USF-222 service disposition rows are incomplete")
    for service_id, row in service_rows.items():
        if row.get("readinessClaimAllowed") is not False:
            F.add("USF-ENTERPRISE-030", service_id, "service disposition must deny readiness claims")
        if not row.get("executionEvidence") or not row.get("nonEquivalenceBoundary"):
            F.add("USF-ENTERPRISE-030", service_id, "service disposition must record execution evidence and non-equivalence boundary")

    package_scripts = (state.get("package") or {}).get("scripts", {})
    if package_scripts.get("proof:observability:operations-execution") != "tsx packages/proof/src/observability-operations-execution-proof.ts":
        F.add("USF-ENTERPRISE-030", "package.json", "USF-222 proof command is missing or stale")
    if "observability-operations-execution-proof:" not in state.get("makefile", ""):
        F.add("USF-ENTERPRISE-030", "Makefile", "USF-222 make target is missing")
    proof_text = state.get("observabilityOperationsExecutionProofText") or ""
    for token in (
        "runObservabilityOperationsExecutionProof",
        'issueId: "USF-222"',
        "alertRoutedToSyntheticReceiver: true",
        "dashboardRuntimeRendered: true",
        "incidentCorrectiveActionRecorded: true",
        "retentionPurgeExecuted: true",
        "crossTenantAggregateTenantNamesSuppressed: true",
        "liveProviderReadinessClaim: false",
        "usf133ClosureClaim: false",
    ):
        if token not in proof_text:
            F.add("USF-ENTERPRISE-030", str(OBSERVABILITY_OPERATIONS_EXECUTION_PROOF_SOURCE_PATH), f"proof marker missing {token}")

    model = state["model"]
    for section, row_ids in OBSERVABILITY_OPERATIONS_EXECUTION_REQUIRED_EVIDENCE_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in row_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-030", row_id, f"missing USF-222 enterprise row in {section}")
                continue
            row_text = json.dumps(row, sort_keys=True)
            if missing_required_non_claims(row):
                F.add("USF-ENTERPRISE-030", row_id, "USF-222 enterprise row non-claims are incomplete")
            if "USF-222" not in row_text or str(OBSERVABILITY_OPERATIONS_EXECUTION_PROOF_PATH) not in row_text:
                F.add("USF-ENTERPRISE-030", row_id, "USF-222 row lacks issue or artefact linkage")
            if section != "threatModelAbuseCaseRegister" and not row.get("validationCommand"):
                F.add("USF-ENTERPRISE-030", row_id, "USF-222 row lacks validation command")
            if "platform-observability" not in row_text:
                F.add("USF-ENTERPRISE-030", row_id, "USF-222 row lacks observability owner linkage")

    source_text = json.dumps(proof, sort_keys=True).lower()
    for phrase in (
        "sentry service readiness is proven",
        "alerting readiness is proven",
        "dashboard readiness is proven",
        "incident response readiness is proven",
        "usf-133 closure is proven",
        "production readiness is proven",
        "live provider readiness is proven",
    ):
        if phrase in source_text:
            F.add(
                "USF-ENTERPRISE-030",
                str(OBSERVABILITY_OPERATIONS_EXECUTION_PROOF_PATH),
                f"readiness overclaim present: {phrase}",
            )


def check_backup_restore_operational_depth(F: Findings, state: dict[str, Any]) -> None:
    depth = state.get("backupRestoreOperationalDepth")
    if not isinstance(depth, dict):
        F.add("USF-ENTERPRISE-027", str(BACKUP_RESTORE_OPERATIONAL_DEPTH_PATH), "USF-219 backup restore depth artefact is missing")
        return

    expected_top = {
        "sourceIssue": "USF-219",
        "followUpIssue": "USF-223",
        "parentIssue": "USF-133",
        "status": "bounded-disposition-recorded-execution-proof-deferred",
        "serviceCatalogueAuthority": str(SERVICE_CATALOGUE_PATH),
        "enterpriseEvidenceModel": str(MODEL_PATH),
    }
    for key, expected in expected_top.items():
        if depth.get(key) != expected:
            F.add("USF-ENTERPRISE-027", key, f"expected {expected!r}")
    for field in ("owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate"):
        if not depth.get(field):
            F.add("USF-ENTERPRISE-027", field, "owner, risk, control, and review metadata are required")
    if BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_ISSUES - set(depth.get("issueLinks", [])):
        F.add("USF-ENTERPRISE-027", "issueLinks", "USF-219 issue links are incomplete")
    if REQUIRED_NON_CLAIMS - set(depth.get("nonClaims", [])):
        F.add("USF-ENTERPRISE-027", "nonClaims", "USF-219 non-claims are incomplete")
    if set(depth.get("enterpriseEvidenceRefs", [])) != set().union(*BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_EVIDENCE_ROWS.values()):
        F.add("USF-ENTERPRISE-027", "enterpriseEvidenceRefs", "USF-219 enterprise evidence refs are incomplete")

    claims = depth.get("claims", {})
    if not isinstance(claims, dict):
        F.add("USF-ENTERPRISE-027", "claims", "claims must be an object")
        claims = {}
    for key in (
        "boundedDispositionRecorded",
        "pgbackrestColdBackupRestoreProofAccepted",
        "operationalBackupDepthExplicitlyDeferred",
        "dataBearingPromotionImpactRecorded",
    ):
        if claims.get(key) is not True:
            F.add("USF-ENTERPRISE-027", f"claims.{key}", "bounded disposition marker must be true")
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
            F.add("USF-ENTERPRISE-027", f"claims.{key}", "readiness or closure claim must remain false")

    boundary_rows = rows_by_id(depth.get("boundaries"))
    if BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_BOUNDARIES - set(boundary_rows):
        F.add("USF-ENTERPRISE-027", "boundaries", "required backup/restore boundaries are missing")
    for boundary_id, row in boundary_rows.items():
        if boundary_id == "pgbackrest-cold-backup-restore-local-proof":
            if row.get("status") != "proven-local" or "USF-211" not in json.dumps(row, sort_keys=True):
                F.add("USF-ENTERPRISE-027", boundary_id, "USF-211 bounded local proof must be recorded")
            for field in ("proofCommand", "validationCommand", "evidenceRefs", "nonEquivalenceBoundary", "nonClaimBoundary"):
                if not row.get(field):
                    F.add("USF-ENTERPRISE-027", f"{boundary_id}.{field}", "proven local boundary field is required")
            continue
        if row.get("status") != "deferred-with-owner":
            F.add("USF-ENTERPRISE-027", boundary_id, "operational boundary must be deferred with owner")
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
                F.add("USF-ENTERPRISE-027", f"{boundary_id}.{field}", "deferred boundary field is required")
        if row.get("followUpIssue") != "USF-223":
            F.add("USF-ENTERPRISE-027", f"{boundary_id}.followUpIssue", "deferred execution proof must link USF-223")

    dispositions = rows_by_id(depth.get("dataBearingServiceDispositions"), "serviceId")
    if BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_DATA_SERVICES - set(dispositions):
        F.add("USF-ENTERPRISE-027", "dataBearingServiceDispositions", "data-bearing service promotion impact rows are incomplete")
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
                F.add("USF-ENTERPRISE-027", f"{service_id}.{field}", "data-bearing promotion-impact field is required")

    gate = state.get("usf133ClosureTierGate") or {}
    service_refs = rows_by_id(gate.get("requiredServiceDispositionRefs"), "serviceId")
    pgbackrest_refs = set((service_refs.get("pgbackrest") or {}).get("sourceIssueRefs", []))
    if {"USF-219", "USF-223"} - pgbackrest_refs:
        F.add("USF-ENTERPRISE-027", "serviceRef.pgbackrest", "closure-tier pgBackRest ref must link USF-219 and USF-223")
    exceptions = rows_by_id(gate.get("enterpriseExceptionRegister"))
    for exception_id in ("exception-service-pgbackrest", "exception-capability-backup-restore"):
        exception = exceptions.get(exception_id) or {}
        if exception.get("followUpIssue") != "USF-223":
            F.add("USF-ENTERPRISE-027", exception_id, "backup/restore exception must defer execution proof to USF-223")

    model = state["model"]
    for section, row_ids in BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_EVIDENCE_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in row_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-027", row_id, f"missing USF-219 enterprise row in {section}")
                continue
            row_text = json.dumps(row, sort_keys=True)
            if missing_required_non_claims(row):
                F.add("USF-ENTERPRISE-027", row_id, "USF-219 enterprise row non-claims are incomplete")
            if "USF-219" not in row_text or "USF-223" not in row_text or str(BACKUP_RESTORE_OPERATIONAL_DEPTH_PATH) not in row_text:
                F.add("USF-ENTERPRISE-027", row_id, "USF-219 row lacks issue, follow-up, or artefact linkage")
            if section != "threatModelAbuseCaseRegister" and not row.get("validationCommand"):
                F.add("USF-ENTERPRISE-027", row_id, "USF-219 row lacks validation command")
            if section == "evidenceRegister":
                for issue in BACKUP_RESTORE_OPERATIONAL_DEPTH_REQUIRED_ISSUES:
                    if issue not in row.get("issueLinks", []):
                        F.add("USF-ENTERPRISE-027", row_id, f"evidence row lacks {issue}")
                negative = str(row.get("whatWasNotProven", "")).lower()
                if "not prove" not in negative and "unproven" not in negative:
                    F.add("USF-ENTERPRISE-027", row_id, "evidence row must preserve explicit non-proof boundary")

    source_text = json.dumps(depth, sort_keys=True).lower()
    for phrase in (
        "backup readiness is proven",
        "restore readiness is proven",
        "dr readiness is proven",
        "disaster recovery readiness is proven",
        "pitr readiness is proven",
        "rpo readiness is proven",
        "rto readiness is proven",
        "production readiness is proven",
        "live provider readiness is proven",
        "usf-133 closure is proven",
    ):
        if phrase in source_text:
            F.add("USF-ENTERPRISE-027", str(BACKUP_RESTORE_OPERATIONAL_DEPTH_PATH), f"readiness overclaim present: {phrase}")


def check_backup_restore_execution_proof(F: Findings, state: dict[str, Any]) -> None:
    proof = state.get("backupRestoreExecutionProof")
    if not isinstance(proof, dict):
        F.add(
            "USF-ENTERPRISE-031",
            str(BACKUP_RESTORE_EXECUTION_PROOF_PATH),
            "USF-223 backup restore execution proof artefact is missing",
        )
        return

    expected_top = {
        "sourceIssue": "USF-223",
        "parentIssue": "USF-133",
        "status": "bounded-local-execution-proof-present",
        "serviceCatalogueAuthority": str(SERVICE_CATALOGUE_PATH),
        "enterpriseEvidenceModel": str(MODEL_PATH),
        "proofCommand": "corepack pnpm proof:backup:operations",
        "proofSource": "packages/proof/src/backup-restore-operations-execution-proof.ts",
    }
    for key, expected in expected_top.items():
        if proof.get(key) != expected:
            F.add("USF-ENTERPRISE-031", key, f"expected {expected!r}")
    for field in ("owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate"):
        if not proof.get(field):
            F.add("USF-ENTERPRISE-031", field, "owner, risk, control, treatment, and review metadata are required")
    if BACKUP_RESTORE_EXECUTION_REQUIRED_ISSUES - set(proof.get("issueLinks", [])):
        F.add("USF-ENTERPRISE-031", "issueLinks", "USF-223 issue links are incomplete")
    required_refs = set().union(*BACKUP_RESTORE_EXECUTION_REQUIRED_EVIDENCE_ROWS.values())
    if set(proof.get("enterpriseEvidenceRefs", [])) != required_refs:
        F.add("USF-ENTERPRISE-031", "enterpriseEvidenceRefs", "USF-223 enterprise evidence refs are incomplete")
    if REQUIRED_NON_CLAIMS - set(proof.get("nonClaims", [])):
        F.add("USF-ENTERPRISE-031", "nonClaims", "USF-223 non-claims are incomplete")

    claims = proof.get("claims", {})
    if not isinstance(claims, dict):
        F.add("USF-ENTERPRISE-031", "claims", "claims must be an object")
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
            F.add("USF-ENTERPRISE-031", f"claims.{key}", "bounded local execution marker must be true")
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
            F.add("USF-ENTERPRISE-031", f"claims.{key}", "readiness or closure claim must remain false")

    boundaries = rows_by_id(proof.get("executionProofBoundaries"))
    for boundary_id in (
        "online-backup-and-wal-archive-local-proof",
        "pitr-and-scheduled-backup-operation-local-proof",
        "failure-dr-rpo-rto-local-proof",
    ):
        row = boundaries.get(boundary_id)
        if not row:
            F.add("USF-ENTERPRISE-031", "executionProofBoundaries", f"missing {boundary_id}")
            continue
        if row.get("status") != "proven-local" or row.get("sourceIssue") != "USF-223":
            F.add("USF-ENTERPRISE-031", boundary_id, "execution boundary must be proven-local by USF-223")
        for field in ("whatIsProven", "whatIsNotProven", "nonEquivalenceBoundary", "evidenceSource"):
            if not row.get(field):
                F.add("USF-ENTERPRISE-031", f"{boundary_id}.{field}", "execution boundary field is required")
        if "not prove" not in str(row.get("whatIsNotProven", "")).lower():
            F.add("USF-ENTERPRISE-031", f"{boundary_id}.whatIsNotProven", "negative evidence must preserve explicit non-proof boundary")

    deferred = rows_by_id(proof.get("remainingDeferredBoundaries"))
    for boundary_id in ("environment-promotion-backup-gates", "provider-managed-backup-and-supplier-boundary"):
        row = deferred.get(boundary_id)
        if not row:
            F.add("USF-ENTERPRISE-031", "remainingDeferredBoundaries", f"missing {boundary_id}")
            continue
        if row.get("status") != "deferred-with-owner":
            F.add("USF-ENTERPRISE-031", boundary_id, "remaining boundary must be deferred with owner")
        for field in ("owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate", "promotionImpact", "followUpIssue", "nonClaimBoundary"):
            if not row.get(field):
                F.add("USF-ENTERPRISE-031", f"{boundary_id}.{field}", "deferred boundary field is required")

    model = state["model"]
    for section, row_ids in BACKUP_RESTORE_EXECUTION_REQUIRED_EVIDENCE_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in row_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-031", row_id, f"missing USF-223 enterprise row in {section}")
                continue
            row_text = json.dumps(row, sort_keys=True)
            if missing_required_non_claims(row):
                F.add("USF-ENTERPRISE-031", row_id, "USF-223 enterprise row non-claims are incomplete")
            if "USF-223" not in row_text or str(BACKUP_RESTORE_EXECUTION_PROOF_PATH) not in row_text:
                F.add("USF-ENTERPRISE-031", row_id, "USF-223 row lacks issue or artefact linkage")
            if section != "threatModelAbuseCaseRegister" and not row.get("validationCommand"):
                F.add("USF-ENTERPRISE-031", row_id, "USF-223 row lacks validation command")
            if section == "evidenceRegister":
                for issue in ("USF-223", "USF-219", "USF-211", "USF-184", "USF-192", "USF-133"):
                    if issue not in row.get("issueLinks", []):
                        F.add("USF-ENTERPRISE-031", row_id, f"evidence row lacks {issue}")
                negative = str(row.get("whatWasNotProven", "")).lower()
                if "not prove" not in negative and "unproven" not in negative:
                    F.add("USF-ENTERPRISE-031", row_id, "evidence row must preserve explicit non-proof boundary")

    source_text = json.dumps(proof, sort_keys=True).lower()
    for phrase in (
        "backup readiness is proven",
        "restore readiness is proven",
        "dr readiness is proven",
        "disaster recovery readiness is proven",
        "pitr readiness is proven",
        "rpo readiness is proven",
        "rto readiness is proven",
        "production readiness is proven",
        "live provider readiness is proven",
        "usf-133 closure is proven",
    ):
        if phrase in source_text:
            F.add("USF-ENTERPRISE-031", str(BACKUP_RESTORE_EXECUTION_PROOF_PATH), f"readiness overclaim present: {phrase}")


def check_generated_client_graphql_delivery_depth(F: Findings, state: dict[str, Any]) -> None:
    depth = state.get("generatedClientGraphqlDeliveryDepth")
    if not isinstance(depth, dict):
        F.add(
            "USF-ENTERPRISE-028",
            str(GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_PATH),
            "USF-220 generated-client GraphQL delivery-depth artefact is missing",
        )
        return

    expected_top = {
        "sourceIssue": "USF-220",
        "followUpIssue": "USF-224",
        "parentIssue": "USF-133",
        "status": "bounded-disposition-recorded-execution-proof-deferred",
        "serviceCatalogueAuthority": str(SERVICE_CATALOGUE_PATH),
        "enterpriseEvidenceModel": str(MODEL_PATH),
    }
    for key, expected in expected_top.items():
        if depth.get(key) != expected:
            F.add("USF-ENTERPRISE-028", key, f"expected {expected!r}")
    for field in ("owner", "riskOwner", "controlOwner", "riskTreatment", "reviewDate"):
        if not depth.get(field):
            F.add("USF-ENTERPRISE-028", field, "owner, risk, control, and review metadata are required")
    if GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_REQUIRED_ISSUES - set(depth.get("issueLinks", [])):
        F.add("USF-ENTERPRISE-028", "issueLinks", "USF-220 issue links are incomplete")
    if GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_PROHIBITED_CLAIMS - set(depth.get("nonClaims", [])):
        F.add("USF-ENTERPRISE-028", "nonClaims", "USF-220 non-claims are incomplete")
    if set(depth.get("enterpriseEvidenceRefs", [])) != set().union(
        *GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_REQUIRED_EVIDENCE_ROWS.values()
    ):
        F.add("USF-ENTERPRISE-028", "enterpriseEvidenceRefs", "USF-220 enterprise evidence refs are incomplete")

    claims = depth.get("claims", {})
    if not isinstance(claims, dict):
        F.add("USF-ENTERPRISE-028", "claims", "claims must be an object")
        claims = {}
    for key in (
        "selectedClosureTierDispositionRecorded",
        "predecessorDispositionsAccepted",
        "followUpExecutionProofLinked",
        "apiMatricesCurrent",
        "enterpriseEvidenceRowsCurrent",
        "nonEquivalenceBoundariesRecorded",
    ):
        if claims.get(key) is not True:
            F.add("USF-ENTERPRISE-028", f"claims.{key}", "bounded disposition marker must be true")
    for key in (
        "generatedSdkReadinessClaim",
        "generatedClientReadinessClaim",
        "externalDeveloperPlatformReadinessClaim",
        "graphqlRuntimeReadinessClaim",
        "federationReadinessClaim",
        "publicApiReadinessClaim",
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
            F.add("USF-ENTERPRISE-028", f"claims.{key}", "readiness or closure claim must remain false")

    surfaces = rows_by_id(depth.get("surfaceDispositions"))
    if GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_REQUIRED_SURFACES - set(surfaces):
        F.add("USF-ENTERPRISE-028", "surfaceDispositions", "required generated-client GraphQL surfaces are missing")
    for surface_id, row in surfaces.items():
        if row.get("status") not in {"deferred-with-owner", "out-of-scope-with-rationale"}:
            F.add("USF-ENTERPRISE-028", surface_id, "surface must be deferred or out of current scope")
        for field in (
            "owner",
            "riskOwner",
            "controlOwner",
            "riskTreatment",
            "followUpIssue",
            "reviewDate",
            "promotionImpact",
            "evidenceRefs",
            "nonEquivalenceBoundary",
            "nonClaimBoundary",
        ):
            if not row.get(field):
                F.add("USF-ENTERPRISE-028", f"{surface_id}.{field}", "surface disposition field is required")
        if row.get("followUpIssue") != "USF-224":
            F.add("USF-ENTERPRISE-028", f"{surface_id}.followUpIssue", "surface execution proof must link USF-224")

    model = state["model"]
    for section, row_ids in GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_REQUIRED_EVIDENCE_ROWS.items():
        rows = rows_by_id(model.get(section))
        for row_id in row_ids:
            row = rows.get(row_id)
            if not row:
                F.add("USF-ENTERPRISE-028", row_id, f"missing USF-220 enterprise row in {section}")
                continue
            row_text = json.dumps(row, sort_keys=True)
            if missing_required_non_claims(row):
                F.add("USF-ENTERPRISE-028", row_id, "USF-220 enterprise row non-claims are incomplete")
            if (
                "USF-220" not in row_text
                or "USF-224" not in row_text
                or str(GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_PATH) not in row_text
            ):
                F.add("USF-ENTERPRISE-028", row_id, "USF-220 row lacks issue, follow-up, or artefact linkage")
            if section != "threatModelAbuseCaseRegister" and not row.get("validationCommand"):
                F.add("USF-ENTERPRISE-028", row_id, "USF-220 row lacks validation command")
            if section == "evidenceRegister":
                for issue in GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_REQUIRED_ISSUES:
                    if issue not in row.get("issueLinks", []):
                        F.add("USF-ENTERPRISE-028", row_id, f"evidence row lacks {issue}")
                negative = str(row.get("whatWasNotProven", "")).lower()
                if "does not prove" not in negative and "not prove" not in negative:
                    F.add("USF-ENTERPRISE-028", row_id, "evidence row must preserve explicit non-proof boundary")

    source_text = json.dumps(depth, sort_keys=True).lower()
    for phrase in (
        "generated sdk readiness is proven",
        "generated client readiness is proven",
        "external developer platform readiness is proven",
        "graphql readiness is proven",
        "graphql runtime readiness is proven",
        "federation readiness is proven",
        "public api readiness is proven",
        "production readiness is proven",
        "live provider readiness is proven",
        "usf-133 closure is proven",
    ):
        if phrase in source_text:
            F.add(
                "USF-ENTERPRISE-028",
                str(GENERATED_CLIENT_GRAPHQL_DELIVERY_DEPTH_PATH),
                f"readiness overclaim present: {phrase}",
            )


def check_enterprise_iso_style_evidence_foundation(F: Findings, state: dict[str, Any]) -> None:
    foundation = state.get("enterpriseIsoStyleEvidenceFoundation")
    if not isinstance(foundation, dict):
        F.add(
            "USF-ENTERPRISE-032",
            str(ENTERPRISE_ISO_STYLE_EVIDENCE_FOUNDATION_PATH),
            "enterprise ISO-style evidence foundation is missing",
        )
        return
    if foundation.get("issueId") != "USF-272" or foundation.get("status") != "foundation-index-complete":
        F.add("USF-ENTERPRISE-032", str(ENTERPRISE_ISO_STYLE_EVIDENCE_FOUNDATION_PATH), "foundation issue linkage or status is invalid")
    if foundation.get("stagingSpecificEnablementBlockedByThisTrack") is not False:
        F.add("USF-ENTERPRISE-032", "stagingSpecificEnablementBlockedByThisTrack", "foundation must not block staging-specific enablement by default")
    boundary = foundation.get("frameworkBoundary", {})
    if not isinstance(boundary, dict):
        F.add("USF-ENTERPRISE-032", "frameworkBoundary", "framework boundary is missing")
        boundary = {}
    expected_false_claims = (
        "iso27001CertificationClaim",
        "socReadinessClaim",
        "enterpriseProductionReadinessClaim",
    )
    for key in expected_false_claims:
        if boundary.get(key) is not False:
            F.add("USF-ENTERPRISE-032", f"frameworkBoundary.{key}", "certification or readiness claim must remain false")
    if boundary.get("iso27001SupportOnly") is not True or boundary.get("statementOfApplicabilityStyleSupport") is not True:
        F.add("USF-ENTERPRISE-032", "frameworkBoundary", "ISO support and SoA-style posture must be explicit")

    owner_registry = foundation.get("ownerRegistry")
    if not isinstance(owner_registry, dict) or not owner_registry:
        F.add("USF-ENTERPRISE-032", "ownerRegistry", "owner registry is missing")
        owner_registry = {}
    else:
        for owner_id, owner_row in owner_registry.items():
            subject = f"ownerRegistry.{owner_id}"
            if not isinstance(owner_row, dict):
                F.add("USF-ENTERPRISE-032", subject, "owner registry row must be an object")
                continue
            for field in ("ownerId", "ownerKind", "resolution", "reviewCadence", "nextReviewDate", "sourceFields"):
                if not owner_row.get(field):
                    F.add("USF-ENTERPRISE-032", f"{subject}.{field}", "owner registry field is missing")
            if owner_row.get("ownerId") != owner_id:
                F.add("USF-ENTERPRISE-032", f"{subject}.ownerId", "owner registry key and ownerId differ")
            if not isinstance(owner_row.get("sourceFields"), list):
                F.add("USF-ENTERPRISE-032", f"{subject}.sourceFields", "owner source fields must be a list")
            if isinstance(owner_row.get("nextReviewDate"), str) and not DATE_RE.match(owner_row["nextReviewDate"]):
                F.add("USF-ENTERPRISE-032", f"{subject}.nextReviewDate", "owner registry next review date is invalid")

    def owner_resolves(subject: str, owner_id: Any) -> None:
        if not isinstance(owner_id, str) or not owner_id:
            F.add("USF-ENTERPRISE-032", subject, "owner reference is missing")
            return
        if owner_id not in owner_registry:
            F.add("USF-ENTERPRISE-032", subject, f"owner reference does not resolve through ownerRegistry: {owner_id}")

    for key in ("parentOwner", "parentRiskOwner", "parentControlOwner", "parentEvidenceOwner"):
        owner_resolves(f"owners.{key}", foundation.get("owners", {}).get(key))

    def check_evidence_source(subject: str, evidence_source: Any, self_reference: str, require_model: bool = True) -> None:
        if not isinstance(evidence_source, str) or not evidence_source.strip():
            F.add("USF-ENTERPRISE-032", subject, "evidence source is missing")
            return
        parts = [part.strip() for part in evidence_source.split(";") if part.strip()]
        if not parts:
            F.add("USF-ENTERPRISE-032", subject, "evidence source is empty")
            return
        if parts == [self_reference]:
            F.add("USF-ENTERPRISE-032", subject, "foundation evidence source cannot be self-only")
        if require_model and str(MODEL_PATH) not in evidence_source:
            F.add("USF-ENTERPRISE-032", subject, "foundation evidence source must cite repository enterprise evidence model")
        for part in parts:
            if part.startswith("USF-"):
                continue
            path = part.split("#", 1)[0]
            if path and not (ROOT / path).exists():
                F.add("USF-ENTERPRISE-032", subject, f"evidence source path does not resolve: {path}")

    child_ids = set(foundation.get("childIssueIds", []))
    if child_ids != REQUIRED_ENTERPRISE_FOUNDATION_ISSUES:
        F.add("USF-ENTERPRISE-032", "childIssueIds", f"child issue set is incomplete: {sorted(REQUIRED_ENTERPRISE_FOUNDATION_ISSUES - child_ids)}")
    domains = foundation.get("domains")
    if not isinstance(domains, list):
        F.add("USF-ENTERPRISE-032", "domains", "domain evidence rows are missing")
        domains = []
    domains_by_issue = {row.get("issueId"): row for row in domains if isinstance(row, dict)}
    if set(domains_by_issue) != REQUIRED_ENTERPRISE_FOUNDATION_ISSUES:
        F.add("USF-ENTERPRISE-032", "domains", "domain rows do not cover all child issues")
    required_non_claims = {
        "staging-readiness",
        "production-readiness",
        "deployment-readiness",
        "live-provider-readiness",
        "soc-readiness",
        "iso27001-certification",
        "enterprise-production-readiness",
        "product-ui-readiness",
        "browser-e2e-readiness",
        "full-product-readiness",
    }
    for issue_id in sorted(REQUIRED_ENTERPRISE_FOUNDATION_ISSUES):
        row = domains_by_issue.get(issue_id, {})
        for field in (
            "domainId",
            "purpose",
            "owner",
            "riskOwner",
            "controlOwner",
            "evidenceOwner",
            "reviewCadence",
            "nextReviewDate",
            "evidenceSource",
            "validationExpectation",
            "implementationStatus",
            "riskTreatment",
            "deferredBoundary",
        ):
            if not row.get(field):
                F.add("USF-ENTERPRISE-032", f"domains.{issue_id}.{field}", "foundation domain field is missing")
        for field in ("owner", "riskOwner", "controlOwner", "evidenceOwner"):
            owner_resolves(f"domains.{issue_id}.{field}", row.get(field))
        evidence_source = str(row.get("evidenceSource", ""))
        self_reference = f"docs/architecture/enterprise-iso-style-evidence-foundation.json#domains.{row.get('domainId')}"
        check_evidence_source(f"domains.{issue_id}.evidenceSource", evidence_source, self_reference)
        if row.get("scopeRecorded") is not True or row.get("evidenceModelDefined") is not True:
            F.add("USF-ENTERPRISE-032", f"domains.{issue_id}", "scope and evidence model must be defined")
        if row.get("validationExpectation") != "python3 tools/validate-enterprise/validate-enterprise.py all --json":
            F.add("USF-ENTERPRISE-032", f"domains.{issue_id}.validationExpectation", "domain validation command is invalid")
        posture = row.get("readinessBlockingPosture", {})
        if not isinstance(posture, dict) or posture.get("blocksStagingSpecificEnablementByDefault") is not False:
            F.add("USF-ENTERPRISE-032", f"domains.{issue_id}.readinessBlockingPosture", "staging blocking posture is missing or unsafe")
        if len(row.get("evidenceExpectations", [])) < 5:
            F.add("USF-ENTERPRISE-032", f"domains.{issue_id}.evidenceExpectations", "evidence expectations are incomplete")
        if len(row.get("plantedDefectExpectations", [])) < 5:
            F.add("USF-ENTERPRISE-032", f"domains.{issue_id}.plantedDefectExpectations", "planted defect expectations are incomplete")
        if required_non_claims - set(row.get("nonClaims", [])):
            F.add("USF-ENTERPRISE-032", f"domains.{issue_id}.nonClaims", "domain non-claims are incomplete")

    for collection_name in ("controlMatrix", "riskRegister", "childAcceptanceCoverage"):
        rows = foundation.get(collection_name)
        if not isinstance(rows, list):
            F.add("USF-ENTERPRISE-032", collection_name, "foundation collection is missing")
            continue
        issue_ids = {row.get("issueId") for row in rows if isinstance(row, dict)}
        if issue_ids != REQUIRED_ENTERPRISE_FOUNDATION_ISSUES:
            F.add("USF-ENTERPRISE-032", collection_name, "foundation collection does not cover all child issues")

    for control in foundation.get("controlMatrix", []) if isinstance(foundation.get("controlMatrix"), list) else []:
        if not isinstance(control, dict):
            continue
        control_id = control.get("controlId", "unknown-control")
        subject = f"controlMatrix.{control_id}"
        for field in (
            "controlId",
            "issueId",
            "purpose",
            "riskTreated",
            "affectedAssetsOrServices",
            "owner",
            "riskOwner",
            "controlOwner",
            "evidenceSource",
            "validationCommand",
            "status",
            "deferredBoundary",
            "residualRisk",
            "reviewCadence",
        ):
            if not control.get(field):
                F.add("USF-ENTERPRISE-032", f"{subject}.{field}", "foundation control field is missing")
        for field in ("owner", "riskOwner", "controlOwner"):
            owner_resolves(f"{subject}.{field}", control.get(field))
        if not isinstance(control.get("affectedAssetsOrServices"), list) or not control["affectedAssetsOrServices"]:
            F.add("USF-ENTERPRISE-032", f"{subject}.affectedAssetsOrServices", "affected assets/services must be listed")
        if control.get("validationCommand") != "python3 tools/validate-enterprise/validate-enterprise.py all --json":
            F.add("USF-ENTERPRISE-032", f"{subject}.validationCommand", "control validation command is invalid")
        control_self_reference = (
            f"docs/architecture/enterprise-iso-style-evidence-foundation.json#controlMatrix.{control_id}"
        )
        check_evidence_source(f"{subject}.evidenceSource", control.get("evidenceSource"), control_self_reference)
        if required_non_claims - set(control.get("nonClaims", [])):
            F.add("USF-ENTERPRISE-032", f"{subject}.nonClaims", "control non-claims are incomplete")

    for risk in foundation.get("riskRegister", []) if isinstance(foundation.get("riskRegister"), list) else []:
        if not isinstance(risk, dict):
            continue
        risk_id = risk.get("riskId", "unknown-risk")
        subject = f"riskRegister.{risk_id}"
        for field in (
            "riskId",
            "issueId",
            "riskStatement",
            "treatment",
            "owner",
            "reviewDate",
            "followUpIssue",
            "promotionImpact",
            "residualRisk",
            "reviewCadence",
            "evidenceSource",
        ):
            if not risk.get(field):
                F.add("USF-ENTERPRISE-032", f"{subject}.{field}", "foundation risk field is missing")
        owner_resolves(f"{subject}.owner", risk.get("owner"))
        if isinstance(risk.get("reviewDate"), str) and not DATE_RE.match(risk["reviewDate"]):
            F.add("USF-ENTERPRISE-032", f"{subject}.reviewDate", "risk review date is invalid")
        if not isinstance(risk.get("promotionImpact"), list) or not risk["promotionImpact"]:
            F.add("USF-ENTERPRISE-032", f"{subject}.promotionImpact", "risk promotion impact must be listed")
        risk_self_reference = f"docs/architecture/enterprise-iso-style-evidence-foundation.json#riskRegister.{risk_id}"
        check_evidence_source(f"{subject}.evidenceSource", risk.get("evidenceSource"), risk_self_reference)

    exceptions = foundation.get("exceptionWorkflow", {})
    if not isinstance(exceptions, dict):
        F.add("USF-ENTERPRISE-032", "exceptionWorkflow", "exception workflow is missing")
    else:
        required_fields = {"reason", "owner", "riskOwner", "compensatingControl", "expiry", "validationCommand", "followUpIssue"}
        if set(exceptions.get("requiredFields", [])) != required_fields:
            F.add("USF-ENTERPRISE-032", "exceptionWorkflow.requiredFields", "exception workflow required fields are incomplete")
        if exceptions.get("expiredExceptionAccepted") is not False or exceptions.get("ownerlessExceptionAccepted") is not False:
            F.add("USF-ENTERPRISE-032", "exceptionWorkflow", "expired or ownerless exceptions are allowed")


def run_checks(state: dict[str, Any]) -> Findings:
    F = Findings()
    check_shape(F, state)
    if F.blocking_or_error():
        return F
    check_policy_and_non_claims(F, state)
    check_soa_coverage(F, state)
    check_evidence_register(F, state)
    check_threat_posture(F, state)
    check_sdk_governance(F, state)
    check_observability_standard(F, state)
    check_posture_registers(F, state)
    check_lane6_safety_controls(F, state)
    check_closure_matrix_linkage(F, state)
    check_operator_access_gateway_matrix(F, state)
    check_operator_access_review_deprovisioning_depth(F, state)
    check_operator_access_lifecycle_execution_proof(F, state)
    check_lane4_observability(F, state)
    check_assurance_control_plane_disposition(F, state)
    check_environment_promotion_standard(F, state)
    check_operator_access_proof_wiring(F, state)
    check_gateway_clickthrough_substrate(F, state)
    check_static_analysis_quality_gate_disposition(F, state)
    check_sonarqube_service_proof_boundary(F, state)
    check_sentry_error_monitoring_disposition(F, state)
    check_sentry_service_proof_boundary(F, state)
    check_observability_service_operations_depth(F, state)
    check_observability_operations_execution_proof(F, state)
    check_backup_restore_operational_depth(F, state)
    check_backup_restore_execution_proof(F, state)
    check_generated_client_graphql_delivery_depth(F, state)
    check_enterprise_iso_style_evidence_foundation(F, state)
    return F


def run_selftest() -> list[dict[str, str]]:
    findings: list[dict[str, str]] = []
    planted_paths = sorted((ROOT / PLANTED_DEFECT_DIR).glob("*.json"))
    if not (ROOT / PLANTED_DEFECT_DIR).exists():
        return [
            {
                "severity": "blocking",
                "ruleId": "USF-ENTERPRISE-SELFTEST",
                "subject": str(PLANTED_DEFECT_DIR),
                "message": "planted defect directory is missing",
            }
        ]
    if not planted_paths:
        return [
            {
                "severity": "blocking",
                "ruleId": "USF-ENTERPRISE-SELFTEST",
                "subject": str(PLANTED_DEFECT_DIR),
                "message": "planted defect directory has no JSON fixtures",
            }
        ]
    for path in planted_paths:
        defect = json.loads(path.read_text(encoding="utf-8"))
        expected = defect.get("expectedRule")
        state = load_state(defect)
        F = run_checks(state)
        if expected not in F.rule_ids():
            findings.append(
                {
                    "severity": "blocking",
                    "ruleId": "USF-ENTERPRISE-SELFTEST",
                    "subject": str(path.relative_to(ROOT)),
                    "message": f"expected {expected}, got {sorted(F.rule_ids())}",
                }
            )
    return findings


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", nargs="?", default="all", choices=["all", "selftest"])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    findings: list[dict[str, str]]
    if args.mode == "selftest":
        findings = run_selftest()
    else:
        F = run_checks(load_state())
        findings = F.items + run_selftest()

    if args.json:
        print(json.dumps({"mode": args.mode, "ok": not findings, "findings": findings, "rules": RULES}, indent=2))
    else:
        for finding in findings:
            print(f"{finding['severity']} {finding['ruleId']} {finding['subject']}: {finding['message']}")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
