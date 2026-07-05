import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const ROOT = new URL("../../..", import.meta.url).pathname;
const MATRIX_PATH = join(ROOT, "docs/architecture/capability-source-coverage-matrix.md");
const CONTRACT_DIR = join(ROOT, "spec/instances/semantic-contract");
const SERVICE_CATALOGUE_PATH = join(ROOT, "spec/instances/compose-service/service-catalogue.json");
const COMPOSED_SERVICE_MATRIX_PATH = join(ROOT, "docs/architecture/composed-service-integration-test-matrix.json");
const FOUNDATION_CLOSURE_IMPORT_SOURCE = "docs/architecture/proof-cockpit-foundation-substrate-closure-import.json";
const FOUNDATION_CLOSURE_RECORD_SOURCE = "docs/architecture/usf-current-state-foundation-closure-record.json";
const FOUNDATION_CLOSURE_PROVENANCE_SOURCE = "docs/architecture/superseded-lineage-closure-provenance.json";
const FOUNDATION_CLOSURE_VALIDATOR_COMMAND = Object.freeze([
  "python3",
  "tools/validate-foundation-substrate-closure/validate-foundation-substrate-closure.py",
  "all",
  "--json",
]);
const LINEAR_ISSUE = "USF-293";
const ACCEPTANCE_ISSUE = "USF-290";
const RELATED_ISSUES = Object.freeze([
  "USF-290",
  "USF-291",
  "USF-292",
  "USF-234",
  "USF-260",
  "USF-267",
  "USF-268",
  "USF-269",
  "USF-270",
  "USF-271",
  "USF-272",
  "USF-289",
  "USF-294",
]);
const PERSISTENT_EVIDENCE_ROOT = join(ROOT, "evidence/proof-evidence/proof-cockpit");
const PERSISTENT_EVIDENCE_STORE_PATH = join(PERSISTENT_EVIDENCE_ROOT, "staging-evidence-store.json");
const FINAL_REPORT_PATH = join(PERSISTENT_EVIDENCE_ROOT, "final-external-review-report.md");
const EXTERNAL_REVIEW_BUNDLE_PATH = join(PERSISTENT_EVIDENCE_ROOT, "external-review-bundle");
const DEFAULT_STATE_PATH =
  process.env.USF_PROOF_COCKPIT_STATE_PATH ?? join(PERSISTENT_EVIDENCE_ROOT, "human-review-actions.json");

const NON_CLAIMS = Object.freeze([
  "no-staging-readiness",
  "no-production-readiness",
  "no-deployment-readiness",
  "no-live-provider-readiness",
  "no-soc-readiness",
  "no-iso-certification",
  "no-enterprise-production-readiness",
  "no-real-user-product-ui-readiness",
  "no-browser-e2e-readiness",
  "no-full-product-readiness",
  "no-usf-290-completion",
]);

const ROLES = Object.freeze([
  "anonymous visitor denial persona",
  "authenticated user",
  "tenant member",
  "tenant admin",
  "delegated admin",
  "billing admin",
  "developer",
  "support operator",
  "platform operator",
  "auditor",
  "break-glass operator",
  "read-only observer",
]);

const ROUTES = Object.freeze([
  "/proof",
  "/proof/portfolio",
  "/proof/claims",
  "/proof/claims/:claimId",
  "/proof/qa",
  "/proof/foundation-substrate-closure",
  "/proof/actions",
  "/proof/actions/:actionId",
  "/proof/semantic-definitions",
  "/proof/semantic-definitions/:definitionId",
  "/proof/machine-runs",
  "/proof/machine-runs/:runId",
  "/proof/import",
  "/proof/import/:runId",
  "/proof/import/:runId/capabilities/:capabilityId",
  "/proof/review",
  "/proof/review/:reviewId",
  "/proof/review/gaps",
  "/proof/review/nonconformities",
  "/proof/review/corrective-actions",
  "/proof/export",
  "/proof/reports",
  "/proof/reports/final",
  "/proof/capabilities",
  "/proof/capabilities/:capabilityId",
  "/proof/services",
  "/proof/services/:serviceId",
  "/proof/screenshots",
  "/proof/screenshots/:screenshotId",
  "/proof/evidence",
  "/proof/sources",
  "/proof/source",
  "/proof/scenarios/:scenarioId",
  "/proof/roles",
  "/proof/evidence/:evidenceId",
  "/proof/audit",
  "/proof/observability",
  "/proof/fixtures",
  "/proof/alerts",
  "/proof/signoff",
  "/proof/result",
  "/proof/enterprise",
  "/proof/enterprise/isms-scope",
  "/proof/enterprise/risk-register",
  "/proof/enterprise/statement-of-applicability",
  "/proof/enterprise/assets",
  "/proof/enterprise/suppliers",
  "/proof/enterprise/access-review",
  "/proof/enterprise/secrets-crypto",
  "/proof/enterprise/audit-retention",
  "/proof/enterprise/backup-dr",
  "/proof/enterprise/change-release",
  "/proof/enterprise/supply-chain",
  "/proof/enterprise/privacy-data-protection",
  "/proof/enterprise/tenant-isolation",
  "/proof/enterprise/resilience-capacity",
  "/proof/enterprise/observability-runbooks",
  "/proof/enterprise/policy-governance",
  "/proof/enterprise/iso-control-support",
  "/proof/enterprise/internal-audit",
  "/proof/enterprise/legal-regulatory",
  "/proof/enterprise/security-objectives",
  "/proof/enterprise/document-control",
  "/proof/enterprise/competence-awareness",
  "/proof/enterprise/physical-environmental",
  "/proof/enterprise/secure-sdlc",
  "/proof/enterprise/evidence-integrity",
  "/proof/enterprise/nonconformity-corrective-action",
  "/proof/enterprise/management-review",
  "/proof/enterprise/single-operator-risk",
  "/proof/runbook",
]);

const ROUTE_SUMMARIES = Object.freeze([
  ["/proof", "Cockpit dashboard", "Confirm latest machine QA, gap/warn/fail counts, source SHA, evidence store, proof ladder, blockers, and non-claims.", "source SHA, deployment metadata, latest run, durable evidence store, visible non-claims"],
  ["/proof/portfolio", "Complete assurance portfolio", "Review all claims, semantic definitions, capabilities, services, evidence, controls, risks, screenshots, and human review states.", "data-driven assurance portfolio"],
  ["/proof/claims", "Claim assurance case index", "Open every claim and inspect what, why, when, where, how, evidence, controls, risks, screenshots, and human decision state.", "claim records, semantic mappings, service mappings"],
  ["/proof/claims/:claimId", "Claim assurance case detail", "Review one claim's complete chain of custody and record human review or corrective action.", "claim evidence, screenshot or equivalent, audit/observability/alert, fixture, review state"],
  ["/proof/qa", "Formal human QA workflow", "Follow the per-capability confirmation sequence and stop conditions before signoff.", "human action record, screenshot, correlation id, immutable artifact"],
  ["/proof/foundation-substrate-closure", "Foundation substrate closure evidence", "Review current Dev and Test closure before accepting staging QA evidence.", "current-state report, Dev closure artefacts, sealed provenance, validator result, PR merge SHA"],
  ["/proof/actions", "Recorded QA action ledger", "Review submitted browser QA actions, blockers, evidence links, and confirmation check states.", "file-backed local QA records; not immutable final evidence"],
  ["/proof/actions/:actionId", "QA action detail", "Review one submitted action and decide whether more evidence or correction is needed.", "operator-entered action fields, source SHA, timestamp"],
  ["/proof/semantic-definitions", "Semantic definition portfolio", "Confirm every semantic contract is mapped to capability, claim, evidence, and review state.", "semantic contract registry and claim/evidence map"],
  ["/proof/semantic-definitions/:definitionId", "Semantic definition detail", "Review one definition's source path, claim mapping, evidence mapping, stale state, and non-claim boundary.", "semantic contract source, claim rows, evidence rows"],
  ["/proof/machine-runs", "Machine QA run index", "Import the latest machine evidence bundle, compare it with prior runs, and inspect run status.", "qa-run manifest, report links, import status"],
  ["/proof/machine-runs/:runId", "Machine QA run detail", "Review machine coverage, evidence manifests, gaps, and chain of custody for a selected run.", "run metadata, manifests, screenshots, chain-of-custody"],
  ["/proof/import", "Machine evidence import", "Load a machine QA run for human review without automatic acceptance.", "human import manifest, diff review record, action ledger"],
  ["/proof/import/:runId", "Machine run import detail", "Accept, reject, annotate, defer, or request re-test for machine evidence.", "human import decision records"],
  ["/proof/import/:runId/capabilities/:capabilityId", "Capability evidence import", "Review per-capability machine evidence and record Matthew's human decision.", "capability evidence, screenshots, gaps, decision form"],
  ["/proof/review", "Human evidence review hub", "Triage machine gaps, nonconformities, corrective actions, stale evidence, and residual-risk decisions.", "gap register, nonconformity register, corrective action log"],
  ["/proof/review/:reviewId", "Human review decision detail", "Inspect one persisted human decision, annotation, retest request, corrective action, or residual-risk acceptance.", "durable action ledger and supersession state"],
  ["/proof/review/gaps", "Gap register", "Review machine-found gaps and decide whether to fix, defer, accept risk, or re-test.", "typed gap records"],
  ["/proof/review/nonconformities", "Nonconformities", "Record evidence issues that prevent acceptance and require corrective action.", "nonconformity rows, owner, due date"],
  ["/proof/review/corrective-actions", "Corrective actions", "Track fixes, re-test commands, and validation evidence for rejected or failed machine evidence.", "corrective action rows"],
  ["/proof/export", "External-review export", "Prepare the portable evidence bundle for external reviewer consumption.", "README, executive summary, detailed report, manifests, screenshots"],
  ["/proof/reports", "Report index", "Open final external-review report and machine QA report outputs.", "final report, QA reports, evidence bundle"],
  ["/proof/reports/final", "Final external-review report", "Read the complete 22-section external audit-style handoff report.", "final report sections, portfolio counts, chain of custody, non-claims"],
  ["/proof/capabilities", "All capability inventory", "Choose a capability, then open its service, scenario, evidence, audit, and observability links.", "75 capability rows, domain grouping, current machine-review state"],
  ["/proof/capabilities/:capabilityId", "Capability detail", "Review happy and negative path evidence requirements, verify services, and collect evidence.", "semantic contract, role, service, scenario, fixture, audit, alert, signoff controls"],
  ["/proof/services", "Compose service click-through inventory", "Open each required backing service page before a service-backed capability is accepted.", "service catalogue row, composed integration row, lifecycle command, proof command"],
  ["/proof/services/:serviceId", "Compose service detail", "Verify service health, seed/reset state, safe operation evidence, and operator boundary.", "catalogue ownership, profiles, fixture lifecycle, proof command, runbook gaps"],
  ["/proof/screenshots", "Screenshot and equivalent artifact inventory", "Open every screenshot, service screenshot-equivalent, hash, manifest row, redaction state, and review state.", "screenshot manifest and service evidence manifest"],
  ["/proof/screenshots/:screenshotId", "Screenshot detail", "Review one screenshot or safe equivalent artifact and its hash, chain of custody, service, capability, and review state.", "screenshot manifest row"],
  ["/proof/evidence", "Evidence record index", "Open every normalized evidence record, source document, chain-of-custody row, gap, and corrective action link.", "evidence index and chain-of-custody"],
  ["/proof/sources", "Evidence/source document index", "Open whitelisted source and evidence documents required by the proof ladder and enterprise audit.", "repository paths rendered read-only in browser"],
  ["/proof/source", "Evidence/source document viewer", "Review one whitelisted repository document without shell access.", "read-only repository file content"],
  ["/proof/scenarios/:scenarioId", "Scenario action page", "Perform the listed persona/tenant steps and capture expected result plus evidence links.", "scenario status, expected audit event, expected observability, expected alert"],
  ["/proof/roles", "Role and persona matrix", "Verify role-switch or role-login evidence without unsafe impersonation shortcuts.", "persona, role boundary, audit record"],
  ["/proof/evidence/:evidenceId", "Evidence record page", "Attach or verify proof run, audit, observability, screenshot, PR, Linear, and runbook links.", "evidence id, status, target, source SHA"],
  ["/proof/audit", "Audit evidence matrix", "Confirm every capability has auditable event evidence before acceptance.", "audit event id, actor, tenant, action, correlation id"],
  ["/proof/observability", "Logs metrics traces matrix", "Confirm trace/log/metric evidence and correlation for each exercised path.", "correlation id, trace id, metric, log, dashboard/runbook"],
  ["/proof/fixtures", "Synthetic fixture lifecycle", "Verify seed, reset, cleanup, residual-state, and no-real-tenant-data posture.", "fixture id, lifecycle API, reset evidence"],
  ["/proof/alerts", "Alert coverage matrix", "Confirm expected alert or explicit no-alert rationale per capability/service.", "alert name, condition, route/service, evidence link"],
  ["/proof/signoff", "Final human signoff", "Review missing evidence and disabled final acceptance controls.", "final signoff unavailable marker"],
  ["/proof/result", "Result decision", "Read the eventual decision target and current unavailable state.", "final acceptance artifact not auto-created"],
  ["/proof/enterprise", "Enterprise evidence index", "Open enterprise control-support pages and record missing evidence.", "ISMS-supporting evidence mappings"],
  ["/proof/runbook", "Auditor runbook", "Use the end-to-end audit checklist and stop conditions during formal validation.", "route map, required artefacts, blocked-state guidance"],
]);

const ENTERPRISE_TOPICS = Object.freeze([
  ["isms-scope", "ISMS scope", "Scope, context, interested parties, accountable owner, and non-certification boundary."],
  ["risk-register", "Risk register", "Risk statements, owners, treatments, review dates, and accepted-risk workflow."],
  [
    "statement-of-applicability",
    "Statement of Applicability",
    "Control support matrix, applicability, evidence source, owner, and exception posture.",
  ],
  ["assets", "Asset inventory", "Repository, domains, self-hosted origin, data classes, evidence stores, and service ownership."],
  ["suppliers", "Supplier/provider risk", "Cloudflare, GitHub, Linear, package registries, and replaceability evidence."],
  ["access-review", "Access review", "SSO, MFA, privileged access, break-glass, review cadence, and audit evidence."],
  ["secrets-crypto", "Secrets and cryptography", "Secret boundaries, certificate lifecycle, key handling, and no-secret exposure."],
  ["audit-retention", "Audit retention", "Audit events, retention, tamper evidence, redaction, and evidence immutability."],
  ["backup-dr", "Backup DR", "Backup, restore, disaster recovery, BCP, RTO/RPO-style evidence mappings, and restore evidence."],
  ["change-release", "Change release", "Review, PR, validation, deployment, rollback, and release governance evidence."],
  ["supply-chain", "Supply chain", "SBOM, provenance, dependency pinning, vulnerability handling, and licence posture."],
  [
    "privacy-data-protection",
    "Privacy and data protection",
    "Retention, deletion, export, residency, data minimisation, and tenant data boundary.",
  ],
  ["tenant-isolation", "Tenant isolation", "Customer data boundary, RLS, role/permission checks, and cross-tenant denial evidence."],
  ["resilience-capacity", "Resilience capacity", "Capacity, rate limiting, abuse controls, SLO posture, and degradation handling."],
  ["observability-runbooks", "Observability runbooks", "Dashboards, logs, metrics, traces, alerts, and operator runbooks."],
  ["policy-governance", "Policy governance", "Policy pack, ownership, review cadence, exception process, and AI governance."],
  ["iso-control-support", "ISO control-support map", "ISO/IEC 27001-style control support, evidence owner, applicability, and non-certification boundary."],
  ["internal-audit", "Internal audit readiness", "Audit programme evidence mapping, evidence sampling, findings, independence boundary, and corrective action link."],
  ["legal-regulatory", "Legal and regulatory obligations", "Applicable obligations, contractual commitments, privacy/security duties, and owner review."],
  ["security-objectives", "Security objectives and measurement", "Measurable security objectives, metrics, review cadence, trend evidence, and management visibility."],
  ["document-control", "Document control", "Controlled evidence documents, versioning, review cadence, approval, retention, and supersession handling."],
  ["competence-awareness", "Competence and awareness", "Operator competence, staging QA auditor awareness, training evidence, and role responsibility boundary."],
  ["physical-environmental", "Physical and environmental", "Self-hosted origin facility/provider posture, equipment boundary, power/network dependency, and physical access assumptions."],
  ["secure-sdlc", "Secure SDLC", "Threat-informed development, review, validation, vulnerability handling, planted defects, and release evidence."],
  ["evidence-integrity", "Evidence integrity", "Immutability, source SHA, timestamp, correlation, tamper boundary, retention, and generated-report non-authority."],
  [
    "nonconformity-corrective-action",
    "Nonconformity corrective action",
    "Findings, corrective action, validation, owner, due date, and closure evidence.",
  ],
  ["management-review", "Management review", "Management review inputs, outputs, decisions, and continual improvement."],
  ["single-operator-risk", "Single-operator risk", "Single-operator constraints, compensating controls, break-glass, and succession risk."],
]);

const ENTERPRISE_DOMAIN_ALIASES = Object.freeze({
  "isms-scope-context": "isms-scope",
  "interested-parties": "isms-scope",
  "risk-register-treatment": "risk-register",
  "statement-of-applicability-style-controls": "statement-of-applicability",
  "asset-ownership": "assets",
  "access-control": "access-review",
  "privileged-access-break-glass": "access-review",
  "secrets-cryptographic-lifecycle": "secrets-crypto",
  "logging-monitoring-audit-retention-integrity": "audit-retention",
  "incident-response": "observability-runbooks",
  "nonconformity-corrective-action": "nonconformity-corrective-action",
  "backup-restore-dr-business-continuity": "backup-dr",
  "supplier-provider-dependencies": "suppliers",
  "secure-development-change-governance": "secure-sdlc",
  "privacy-retention-deletion-export-legal-hold-data-residency": "privacy-data-protection",
  "tenant-isolation-customer-data-boundaries": "tenant-isolation",
  "capacity-resilience-rate-limiting-abuse-controls": "resilience-capacity",
  "management-review-continual-improvement": "management-review",
});

const DOMAIN_SERVICES = Object.freeze({
  "identity-access": ["identity provider", "tenant identity store", "relational database", "audit store"],
  authentication: ["identity provider", "auth/session service", "tenant identity store", "audit store"],
  configuration: ["configuration registry", "secrets provider", "audit store"],
  "entitlements-billing": ["billing/entitlements provider", "relational database", "event bus", "audit store"],
  "data-platform": ["relational database", "backup/restore service", "object storage", "audit store"],
  search: ["search index", "relational database", "audit store"],
  storage: ["object storage", "file scanner", "relational database", "audit store"],
  "events-workflow": ["queue/event bus", "workflow runner", "notification transport", "audit store"],
  "compute-runtime": ["worker runtime", "secrets provider", "queue/event bus", "audit store"],
  "observability-ops": ["observability stack", "alerting system", "audit store", "screenshot/artifact store"],
  "security-governance": ["assurance scanner", "evidence store", "audit store"],
  "developer-platform": ["API gateway", "developer portal", "rate-limit store", "audit store"],
  "support-admin": ["tenant administration service", "support workflow store", "audit store"],
  foundation: ["deployment metadata source", "evidence store", "validator suite"],
});

const DOMAIN_SERVICE_IDS = Object.freeze({
  "identity-access": ["keycloak", "keycloak-db", "postgres", "grafana", "loki", "tempo"],
  authentication: ["keycloak", "keycloak-db", "postgres", "grafana", "loki", "tempo"],
  configuration: ["openbao", "postgres", "grafana", "loki"],
  "entitlements-billing": ["postgres", "nats", "webhook-sink", "mailpit", "grafana", "loki"],
  "data-platform": ["postgres", "pgbackrest", "minio", "clickhouse", "redis", "grafana", "loki"],
  search: ["meilisearch", "postgres", "grafana", "loki"],
  storage: ["minio", "clamav", "postgres", "grafana", "loki"],
  "events-workflow": ["nats", "temporal", "temporal-postgres", "windmill", "mailpit", "webhook-sink", "grafana", "loki"],
  "compute-runtime": ["temporal", "temporal-postgres", "windmill", "windmill-worker", "openbao", "nats", "grafana", "loki"],
  "observability-ops": ["grafana", "prometheus", "loki", "tempo", "alertmanager", "alloy", "otel-collector", "sentry"],
  "security-governance": ["sonarqube", "sonar-postgres", "clamav", "openbao", "grafana", "loki"],
  "developer-platform": ["wiremock", "webhook-sink", "redis", "postgres", "mailpit", "public-proof-origin"],
  "support-admin": ["postgres", "grafana", "loki", "mailpit", "keycloak"],
  foundation: ["public-proof-origin", "caddy", "platform-api", "postgres", "grafana", "loki", "prometheus", "otel-collector"],
});

const HUMAN_QA_STEPS = Object.freeze([
  "Confirm source SHA, environment, deployment id, and non-claims on the cockpit landing page.",
  "Select a capability and verify its semantic contract path, domain, role set, scenario links, and evidence mappings.",
  "Open each linked backing service page and confirm compose profile, health/readiness, fixture lifecycle, proof command, and safe-operation evidence requirements.",
  "Perform the happy path with the listed persona and synthetic tenant context.",
  "Perform the negative path, including denial, tenant mismatch, invalid input, degraded dependency, or timeout where the capability requires it.",
  "Capture audit evidence with actor, tenant, action, result, timestamp, and correlation id.",
  "Capture observability evidence with trace id, log line, metric or latency bucket, and dashboard/runbook link.",
  "Verify expected alert evidence or record an explicit no-alert rationale for the capability and service path.",
  "Confirm synthetic fixture seed, reset, cleanup, and residual-state evidence. Stop if real tenant data is required.",
  "Attach screenshot or equivalent immutable artifact, link PR and Linear evidence, then leave final signoff disabled until final proofing is implemented.",
]);

const STOP_CONDITIONS = Object.freeze([
  "SSO or authorised staging access boundary is missing for a real staging exercise.",
  "A required service-backed claim is satisfied only by an in-memory, process-local, or mock substitute.",
  "A service page is missing health, seed/reset, safe-operation, or teardown evidence needed by the capability.",
  "The scenario requires real tenant data, real secrets, private local state, or destructive persistent mutation.",
  "Audit, trace, log, metric, alert, screenshot, or immutable artifact evidence is fabricated or missing.",
  "A route, service, or provider page claims staging, production, SOC, ISO, enterprise readiness, product UI readiness, browser E2E readiness, or full Foundation closure.",
]);

const PROOF_LADDER_LEVELS = Object.freeze([
  [
    "Dev foundation substrate closure",
    "docs/architecture/dev-foundation-substrate-closure.json",
    "Confirm USF-native foundation artefacts are closed and validator-backed before staging proof review.",
    "complete",
  ],
  [
    "Dev Compose substrate closure",
    "docs/architecture/dev-compose-substrate-closure.json",
    "Confirm composed service catalogue and generated Compose substrate are closed for Dev handoff.",
    "complete",
  ],
  [
    "Dev command/proof closure",
    "docs/architecture/dev-command-proof-closure.json",
    "Confirm command and proof closure artefacts identify validator and proof-command evidence.",
    "complete",
  ],
  [
    "Dev-to-Test handoff",
    "docs/architecture/dev-to-test-closure-handoff.json",
    "Confirm Dev closure is handed to the bounded Test track without upgrading readiness claims.",
    "complete",
  ],
  [
    "Test foundation substrate closure",
    "docs/architecture/test-readiness-final-acceptance-gate.md",
    "Confirm the bounded Test final gate and child issue evidence before staging-specific review uses it.",
    "complete",
  ],
  [
    "Sealed provenance",
    "docs/architecture/superseded-lineage-closure-provenance.json",
    "Use sealed provenance only as retained lineage; it does not define current semantics.",
    "sealed-provenance-only",
  ],
  [
    "Staging machine QA",
    "/proof/machine-runs",
    "Review machine QA run, route coverage, service evidence, screenshots, manifests, gaps, and chain of custody.",
    "machine-review-required",
  ],
  [
    "Staging service evidence",
    "/proof/services",
    "Review every service screenshot or safe screenshot-equivalent artifact before accepting service-backed claims.",
    "human-review-required",
  ],
  [
    "Staging human review",
    "/proof/review",
    "Matthew can accept, reject, annotate, request retest, create corrective actions, or accept residual risk.",
    "human-review-required",
  ],
  [
    "Staging acceptance result",
    "/proof/result",
    "Final acceptance is not auto-completed; the result page records the current non-claim boundary.",
    "final-signoff-disabled-until-human-acceptance",
  ],
]);

const MACHINE_PROOF_WORK_MAP = Object.freeze([
  [
    "Dev setup and handover proof",
    "USF-226",
    "docs/architecture/dev-readiness-validation-and-handover.md",
    "Confirm a fresh operator can clone, install, bootstrap, run verification, understand failures, and submit a governed PR without private knowledge.",
  ],
  [
    "Bounded Test final acceptance proof",
    "USF-234",
    "docs/architecture/test-readiness-final-acceptance-gate.md",
    "Confirm every Test child issue and final gate maps to merged evidence before staging QA trusts service-backed claims.",
  ],
  [
    "Test environment service contract",
    "USF-235",
    "docs/architecture/test-environment-service-contract.json",
    "Confirm service-backed capabilities use composed backing services and not in-memory substitutes.",
  ],
  [
    "Composed semantic harness",
    "USF-236",
    "docs/architecture/composed-semantic-test-harness.json",
    "Confirm semantic proof was migrated into composed test-readiness evidence and is not historical scaffolding.",
  ],
  [
    "Deterministic fixtures",
    "USF-237",
    "docs/architecture/deterministic-test-fixture-lifecycle.json",
    "Confirm synthetic seed, reset, cleanup, teardown, repeatability, and no-real-tenant-data posture.",
  ],
  [
    "Command and CI gate",
    "USF-238",
    "docs/architecture/test-readiness-command-surface-and-ci-gate.json",
    "Confirm canonical commands, local/CI alignment, Sonar preservation, and command dependency mappings.",
  ],
  [
    "Obligation manifest and validator gate",
    "USF-239",
    "docs/architecture/semantic-service-test-obligation-manifest.json",
    "Confirm every required capability/test obligation is manifest-backed and validator-enforced.",
  ],
  [
    "Missing evidence planted-defect gate",
    "USF-247",
    "docs/architecture/missing-evidence-planted-defects-regression-gate.json",
    "Confirm validators fail closed when required evidence or per-rule planted defects are missing.",
  ],
  [
    "Test completion and staging-entry gate",
    "USF-260",
    "docs/architecture/test-environment-completion-and-staging-entry-gate.json",
    "Confirm Test completion is valid before staging-specific enablement or staging QA proceeds.",
  ],
  [
    "Foundation substrate closure formal closure",
    "USF-292",
    "docs/architecture/proof-cockpit-foundation-substrate-closure-import.json",
    "Confirm the current-state report, Dev closure artefacts, sealed provenance pointer, chain-of-custody rows, validator pass, and preserved non-claims before staging QA relies on current-state non-UI closure.",
  ],
  [
    "External HTTP semantics gate",
    "USF-267",
    "docs/architecture/pre-staging-external-http-semantics-readiness-gate.json",
    "Confirm external HTTP, cache, observability, and non-destructive smoke gates support starting staging-specific enablement without claiming staging readiness.",
  ],
  [
    "Enterprise control-support foundation",
    "USF-272",
    "docs/architecture/proof-cockpit-machine-qa-evidence-model.json",
    "Confirm ISMS-supporting control evidence exists where relevant, without treating it as ISO certification or SOC readiness.",
  ],
]);

const ENTERPRISE_STAGING_REQUIREMENTS = Object.freeze([
  ["ISMS scope and interested parties", "Scope, context, stakeholders, information assets, and proof-cockpit boundary are visible.", "/proof/enterprise/isms-scope"],
  ["Risk ownership and treatment", "Each staging proof risk has an owner, treatment, review date, and exception path.", "/proof/enterprise/risk-register"],
  ["Control applicability", "Statement of Applicability-style rows show applicable, not applicable, owner, evidence, and rationale.", "/proof/enterprise/statement-of-applicability"],
  ["Asset and supplier inventory", "Public domains, self-hosted origin, repository, CI, DNS, GitHub, Linear, and dependencies are inventory-linked.", "/proof/enterprise/assets"],
  ["Access and privileged operations", "SSO, MFA, break-glass, operator SSH, privileged access, and access-review evidence are represented.", "/proof/enterprise/access-review"],
  ["Secrets and cryptography", "Secret boundaries, certificate lifecycle, key ownership, rotation, and no-secret exposure are represented.", "/proof/enterprise/secrets-crypto"],
  ["Audit and retention", "Audit events, evidence retention, tamper boundary, redaction, and generated-report non-authority are explicit.", "/proof/enterprise/audit-retention"],
  ["Backup and recovery", "Backup, restore, DR, BCP, route/origin recovery, and restore-test evidence are visible.", "/proof/enterprise/backup-dr"],
  ["Change and release governance", "PR, review, validation, deployment, rollback, and Linear reconciliation are visible.", "/proof/enterprise/change-release"],
  ["Supply chain and vulnerability", "SBOM/provenance posture, dependency pins, licence posture, vulnerability handling, and Sonar evidence are visible.", "/proof/enterprise/supply-chain"],
  ["Privacy and tenant boundary", "No real tenant data, retention/deletion/export, residency, tenant isolation, and data minimisation boundaries are visible.", "/proof/enterprise/privacy-data-protection"],
  ["Operational resilience", "Capacity, rate limits, abuse controls, SLO posture, observability, alerting, runbooks, and incident response are represented.", "/proof/enterprise/resilience-capacity"],
  ["Continual improvement", "Nonconformity, corrective action, management review, internal audit, and improvement loop evidence are represented.", "/proof/enterprise/management-review"],
]);

const ISO_SUPPORT_FIELDS = Object.freeze([
  "scope boundary",
  "risk owner",
  "control owner",
  "evidence owner",
  "applicability rationale",
  "evidence source",
  "validation command or human action",
  "review cadence",
  "retention period",
  "exception or risk acceptance path",
  "non-claim statement",
]);

const STAGING_PROOF_UI_REQUIREMENTS = Object.freeze([
  ["Capability QA", "capability, role, synthetic tenant, happy path, negative path, result, screenshot", "/proof/capabilities"],
  ["Scenario execution", "persona, role, tenant, steps performed, expected result, observed result, blocker state", "/proof/scenarios/:scenarioId"],
  ["Service click-through", "service route, compose profile, health/readiness, fixture seed, safe operation, cleanup", "/proof/services/:serviceId"],
  ["Audit review", "actor, tenant, action, event id, timestamp, correlation id, immutable link", "/proof/audit"],
  ["Observability review", "correlation id, trace id, log link, metric or latency bucket, dashboard/runbook link", "/proof/observability"],
  ["Fixture lifecycle", "fixture id, version, seed/reset/cleanup/teardown evidence, residual state, no-real-data check", "/proof/fixtures"],
  ["Alert review", "alert name, condition, service or route, expected severity, evidence link, no-alert rationale", "/proof/alerts"],
  ["Source and document review", "repo path, source SHA, evidence source, auditor confirmation, correction needed", "/proof/sources"],
  ["Enterprise evidence", "risk owner, control owner, evidence owner, applicability, exception path, review cadence", "/proof/enterprise"],
  ["Action ledger", "recorded browser action, role, outcome, notes, links, prerequisite confirmations", "/proof/actions"],
  ["Final signoff", "all actions reviewed, immutable evidence produced, acceptance gate enabled by later implementation", "/proof/signoff"],
]);

const QA_ACTION_TYPES = Object.freeze([
  "capability-qa",
  "service-clickthrough",
  "scenario-exercise",
  "evidence-review",
  "enterprise-evidence-review",
  "source-document-review",
  "blocker-record",
  "machine-run-viewed",
  "machine-evidence-accepted",
  "machine-evidence-rejected",
  "human-note-added",
  "retest-requested",
  "residual-risk-accepted",
  "corrective-action-created",
  "report-exported",
  "human-final-decision",
]);

const QA_OUTCOMES = Object.freeze([
  "draft-performed",
  "evidence-attached",
  "needs-review",
  "blocked",
  "not-applicable-with-rationale",
  "human-accepted",
  "human-rejected",
  "corrective-action-required",
  "retest-requested",
  "residual-risk-accepted",
]);

const SOURCE_DOCUMENTS = Object.freeze([
  ["Dev readiness handover", "docs/architecture/dev-readiness-validation-and-handover.md"],
  ["Test readiness final acceptance", "docs/architecture/test-readiness-final-acceptance-gate.md"],
  ["Test environment service contract", "docs/architecture/test-environment-service-contract.json"],
  ["Composed semantic harness", "docs/architecture/composed-semantic-test-harness.json"],
  ["Deterministic fixture lifecycle", "docs/architecture/deterministic-test-fixture-lifecycle.json"],
  ["Test command surface", "docs/architecture/test-readiness-command-surface-and-ci-gate.json"],
  ["Semantic service obligation manifest", "docs/architecture/semantic-service-test-obligation-manifest.json"],
  ["Missing evidence planted defects gate", "docs/architecture/missing-evidence-planted-defects-regression-gate.json"],
  ["Test completion staging-entry gate", "docs/architecture/test-environment-completion-and-staging-entry-gate.json"],
  ["Pre-staging external HTTP gate", "docs/architecture/pre-staging-external-http-semantics-readiness-gate.json"],
  ["Proof cockpit foundation substrate closure import", "docs/architecture/proof-cockpit-foundation-substrate-closure-import.json"],
  ["Proof cockpit foundation substrate closure import note", "docs/architecture/proof-cockpit-foundation-substrate-closure-import.md"],
  ["USF current-state foundation closure record", "docs/architecture/usf-current-state-foundation-closure-record.json"],
  ["USF current-state foundation closure report note", "docs/architecture/usf-current-state-foundation-closure-report.md"],
  ["Dev foundation substrate closure", "docs/architecture/dev-foundation-substrate-closure.json"],
  ["Dev foundation substrate closure note", "docs/architecture/dev-foundation-substrate-closure.md"],
  ["Dev compose substrate closure", "docs/architecture/dev-compose-substrate-closure.json"],
  ["Dev command proof closure", "docs/architecture/dev-command-proof-closure.json"],
  ["Dev-to-Test closure handoff", "docs/architecture/dev-to-test-closure-handoff.json"],
  ["Sealed closure provenance", "docs/architecture/superseded-lineage-closure-provenance.json"],
  ["Sealed closure provenance note", "docs/architecture/superseded-lineage-closure-provenance.md"],
  ["Proof cockpit machine QA evidence model", "docs/architecture/proof-cockpit-machine-qa-evidence-model.json"],
  ["Proof cockpit machine QA evidence model note", "docs/architecture/proof-cockpit-machine-qa-evidence-model.md"],
  ["Proof cockpit persistent staging evidence store", "evidence/proof-evidence/proof-cockpit/staging-evidence-store.json"],
  ["Proof cockpit final external-review report", "evidence/proof-evidence/proof-cockpit/final-external-review-report.md"],
  ["Proof cockpit external-review bundle README", "evidence/proof-evidence/proof-cockpit/external-review-bundle/README.md"],
  ["Capability source coverage matrix", "docs/architecture/capability-source-coverage-matrix.md"],
  ["Composed service integration matrix", "docs/architecture/composed-service-integration-test-matrix.json"],
  ["Service catalogue", "spec/instances/compose-service/service-catalogue.json"],
  ["Schema registry", "spec/registries/schema-registry.json"],
  ["Taxonomy catalogue", "spec/taxonomies/taxonomy-catalog.json"],
  ["Vocabulary catalogue", "spec/vocabularies/vocabulary-catalog.json"],
]);

const SOURCE_PATH_PREFIXES = Object.freeze([
  "docs/architecture/",
  "artifacts/proof-cockpit/",
  "evidence/proof-evidence/proof-cockpit/",
  "spec/instances/semantic-contract/",
  "spec/instances/compose-service/",
  "spec/registries/",
  "spec/taxonomies/",
  "spec/vocabularies/",
]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function unique(values) {
  return [...new Set(values)];
}

function titleCase(value) {
  return String(value ?? "")
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function splitMarkdownRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((part) => part.trim());
}

function stripBackticks(value) {
  return String(value ?? "").replaceAll("`", "");
}

function statePathFromOptions(options = {}) {
  return options.statePath ?? DEFAULT_STATE_PATH;
}

function blankProofState() {
  return { schemaVersion: 1, actions: [] };
}

function loadProofState(statePath = DEFAULT_STATE_PATH) {
  const state = readJsonOrNull(statePath);
  if (!state || !Array.isArray(state.actions)) {
    return blankProofState();
  }
  return {
    schemaVersion: 1,
    actions: state.actions.filter((action) => action && typeof action === "object"),
    updatedAt: state.updatedAt,
  };
}

function saveProofState(state, statePath = DEFAULT_STATE_PATH) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`);
}

function readJsonOrNull(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readTextOrNull(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function sourceFilePath(sourcePath) {
  return join(ROOT, sourcePath);
}

function loadFoundationClosureEvidence() {
  const importRecord = readJsonOrNull(sourceFilePath(FOUNDATION_CLOSURE_IMPORT_SOURCE)) ?? {};
  const report = readJsonOrNull(sourceFilePath(FOUNDATION_CLOSURE_RECORD_SOURCE)) ?? {};
  const provenance = readJsonOrNull(sourceFilePath(FOUNDATION_CLOSURE_PROVENANCE_SOURCE)) ?? {};
  return {
    importRecord,
    report,
    provenance,
    importedSummary: importRecord.importedEvidenceSummary ?? report.currentSurfaces ?? {},
    evidenceSources: importRecord.evidenceSources ?? [],
    nonClaims: importRecord.nonClaims ?? report.nonClaims ?? [],
  };
}

function contentHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function persistentEvidenceStoreHash() {
  if (!existsSync(PERSISTENT_EVIDENCE_STORE_PATH)) {
    return "store-not-created";
  }
  return contentHash(readFileSync(PERSISTENT_EVIDENCE_STORE_PATH));
}

function loadPersistentEvidenceStore() {
  const store = readJsonOrNull(PERSISTENT_EVIDENCE_STORE_PATH) ?? {};
  const now = new Date().toISOString();
  return {
    id: store.id ?? "proof-cockpit-staging-evidence-store",
    schemaVersion: store.schemaVersion ?? "proof-cockpit-staging-evidence-store-v1",
    path: "evidence/proof-evidence/proof-cockpit/staging-evidence-store.json",
    finalReportPath: "evidence/proof-evidence/proof-cockpit/final-external-review-report.md",
    externalReviewBundlePath: "evidence/proof-evidence/proof-cockpit/external-review-bundle",
    finalReportHash: existsSync(FINAL_REPORT_PATH) ? contentHash(readFileSync(FINAL_REPORT_PATH, "utf8")) : "missing-final-report",
    externalReviewBundlePresent: existsSync(EXTERNAL_REVIEW_BUNDLE_PATH),
    latestMachineRun: {
      runId: store.latestMachineRun?.runId ?? "latest-machine-qa-pending-replay",
      sourceSha: store.latestMachineRun?.sourceSha ?? getSourceSha(),
      deploymentSha: store.latestMachineRun?.deploymentSha ?? process.env.USF_DEPLOYMENT_SHA ?? getSourceSha(),
      environment: store.latestMachineRun?.environment ?? "local-machine-qa",
      generatedAt: store.latestMachineRun?.generatedAt ?? now,
      routeCount: store.latestMachineRun?.routeCount ?? 0,
      capabilityCount: store.latestMachineRun?.capabilityCount ?? 0,
      serviceCount: store.latestMachineRun?.serviceCount ?? 0,
      screenshotCount: store.latestMachineRun?.screenshotCount ?? 0,
      serviceEvidenceCount: store.latestMachineRun?.serviceEvidenceCount ?? 0,
      passCount: store.latestMachineRun?.passCount ?? 0,
      warnCount: store.latestMachineRun?.warnCount ?? 0,
      gapCount: store.latestMachineRun?.gapCount ?? 0,
      failCount: store.latestMachineRun?.failCount ?? 0,
    },
    humanReview: {
      accepted: store.humanReview?.accepted ?? 0,
      rejected: store.humanReview?.rejected ?? 0,
      retestRequested: store.humanReview?.retestRequested ?? 0,
      correctiveActions: store.humanReview?.correctiveActions ?? 0,
      residualRisksAccepted: store.humanReview?.residualRisksAccepted ?? 0,
      finalSignoffAvailable: store.humanReview?.finalSignoffAvailable ?? false,
      finalSignoffCompleted: false,
    },
    storageModel: {
      pathOrService: store.storageModel?.pathOrService ?? "repository path evidence/proof-evidence/proof-cockpit plus generated external-review bundle",
      retentionPosture: store.storageModel?.retentionPosture ?? "retained as repository evidence and superseded by source SHA and run ID",
      backupPosture: store.storageModel?.backupPosture ?? "covered by Git repository backup and PR review retention",
      privacyBoundary: store.storageModel?.privacyBoundary ?? "synthetic or redacted staging QA data only",
      noRealTenantDataBoundary: store.storageModel?.noRealTenantDataBoundary ?? "real tenant data is forbidden in proof cockpit evidence",
      redactionBoundary: store.storageModel?.redactionBoundary ?? "secret, token, private key, password, and raw credential markers fail validation",
      integrityTamperPosture: store.storageModel?.integrityTamperPosture ?? "source SHA, content hash, artifact hash, and chain-of-custody rows are required",
      cleanupRules: store.storageModel?.cleanupRules ?? "generated bundles may be regenerated; reviewed actions remain auditable with supersession",
      freshnessPolicy: store.storageModel?.freshnessPolicy ?? "evidence is stale after source/deployment change or explicit reviewAfter",
      staleEvidenceBehaviour: store.storageModel?.staleEvidenceBehaviour ?? "stale evidence remains visible but cannot satisfy current acceptance",
    },
    relatedIssueReview: store.relatedIssueReview ?? [],
    sourceSha: store.sourceSha ?? getSourceSha(),
    storeHash: persistentEvidenceStoreHash(),
  };
}

function portIdsForServices(services) {
  return unique(
    services.flatMap((service) =>
      (service.ports ?? []).map((port) => `${service.serviceId}:${port.portId ?? port.containerPort ?? port.publishedPort ?? "port"}`),
    ),
  );
}

function adapterIdsForServices(services) {
  return services.map((service) => `${service.serviceId}-evidence-adapter`);
}

function providerIdsForServices(services) {
  return unique(services.map((service) => service.providerBoundary ?? service.serviceKind ?? "compose-provider-boundary"));
}

function controlIdsForDomain(domain) {
  const base = {
    "identity-access": ["control-access-review", "control-tenant-isolation", "control-audit-retention"],
    authentication: ["control-access-review", "control-privileged-access", "control-audit-retention"],
    configuration: ["control-secrets-crypto", "control-change-release", "control-audit-retention"],
    "data-platform": ["control-backup-dr", "control-privacy-data-protection", "control-tenant-isolation"],
    "observability-ops": ["control-logging-monitoring-audit-retention-integrity", "control-incident-response", "control-alerting"],
    "security-governance": ["control-secure-development-change-governance", "control-nonconformity-corrective-action"],
  };
  return base[domain] ?? ["control-risk-treatment", "control-secure-development-change-governance", "control-evidence-integrity"];
}

function riskIdsForDomain(domain) {
  return controlIdsForDomain(domain).map((controlId) => controlId.replace(/^control-/, "risk-"));
}

function buildScreenshotRecords(capabilities, services, store) {
  const storePath = "evidence/proof-evidence/proof-cockpit/staging-evidence-store.json";
  const storeHash = store.storeHash;
  const serviceScreenshots = services.map((service) => {
    const mappings = capabilities.filter((capability) =>
      (capability.serviceRefs ?? []).some((candidate) => candidate.serviceId === service.serviceId),
    );
    return {
      id: `screenshot-service-${service.serviceId}`,
      kind: "compose-service-screenshot-equivalent",
      serviceId: service.serviceId,
      serviceName: service.displayName ?? service.serviceId,
      claimId: `claim-service-${service.serviceId}`,
      capabilityIds: mappings.map((capability) => capability.id),
      scenarioIds: mappings.flatMap((capability) => capability.scenarioIds ?? []),
      artifactPath: `${storePath}#service-evidence-${service.serviceId}`,
      screenshotPath: `${storePath}#service-evidence-${service.serviceId}`,
      screenshotHash: storeHash,
      artifactHash: storeHash,
      timestamp: store.latestMachineRun.generatedAt,
      sourceSha: store.latestMachineRun.sourceSha,
      environment: store.latestMachineRun.environment,
      redactionStatus: "synthetic-or-redacted; direct service screenshots require human review before acceptance",
      syntheticDataConfirmation: "No real tenant data is represented by this screenshot-equivalent manifest.",
      humanReviewStatus: "human-review-required",
      evidenceClass: "api-equivalent",
      directScreenshotRationale:
        "Direct service UI capture may require SSO or authorised staging-safe service login; this equivalent artifact preserves service evidence fields and blocks silent acceptance.",
    };
  });
  const cockpitScreenshots = [
    "/proof",
    "/proof/portfolio",
    "/proof/claims",
    "/proof/capabilities",
    "/proof/services",
    "/proof/evidence",
    "/proof/reports/final",
    "/proof/signoff",
    "/proof/result",
  ].map((route) => ({
    id: `screenshot-route-${slugify(route)}`,
    kind: "proof-route-screenshot-equivalent",
    route,
    claimId: "claim-proof-cockpit-portfolio",
    artifactPath: `${storePath}#route-${slugify(route)}`,
    screenshotPath: `${storePath}#route-${slugify(route)}`,
    screenshotHash: storeHash,
    artifactHash: storeHash,
    timestamp: store.latestMachineRun.generatedAt,
    sourceSha: store.latestMachineRun.sourceSha,
    environment: store.latestMachineRun.environment,
    redactionStatus: "synthetic-or-redacted",
    syntheticDataConfirmation: "No real tenant data is represented by this route screenshot-equivalent manifest.",
    humanReviewStatus: "human-review-required",
    evidenceClass: "api-equivalent",
  }));
  return [...serviceScreenshots, ...cockpitScreenshots];
}

function buildClaims(capabilities, services, foundationClosure, store) {
  const sourceSha = store.latestMachineRun.sourceSha;
  const deploymentSha = store.latestMachineRun.deploymentSha;
  const runId = store.latestMachineRun.runId;
  const capabilityClaims = capabilities.map((capability) => {
    const serviceIds = capability.serviceRefs.map((service) => service.serviceId);
    const screenshotIds = serviceIds.map((serviceId) => `screenshot-service-${serviceId}`);
    return {
      id: `claim-${capability.id}`,
      claimType: "capability-assurance",
      what: `${capability.name} is visible in the staging proof cockpit with semantic, scenario, service, evidence, control, risk, screenshot-equivalent, and human-review mappings.`,
      why: "Capability-level evidence is required so Matthew and external reviewers can selectively sample the assurance case without manually rediscovering every relation.",
      when: store.latestMachineRun.generatedAt,
      where: `/proof/capabilities/${capability.id}`,
      how: "Derived from the capability coverage matrix, semantic contract registry, composed service catalogue, machine QA model, and durable evidence store.",
      whoOrWhat: "USF proof cockpit data builder and machine QA executor",
      sourceSha,
      deploymentSha,
      runId,
      semanticDefinitionId: capability.semanticContractId,
      capabilityId: capability.id,
      serviceIds,
      routeIds: [`/proof/capabilities/${capability.id}`, ...capability.scenarioIds.map((id) => `/proof/scenarios/${id}`)],
      portIds: portIdsForServices(capability.serviceRefs),
      adapterIds: adapterIdsForServices(capability.serviceRefs),
      providerIds: providerIdsForServices(capability.serviceRefs),
      commandIds: unique(capability.serviceRefs.map((service) => service.integration?.proofCommand).filter(Boolean)),
      proofIds: capability.proofTokens,
      evidenceIds: capability.evidenceIds,
      screenshotIds,
      auditIds: [`audit-${capability.id}`],
      logMetricTraceAlertIds: [`observability-${capability.id}`, `alert-${capability.id}`],
      fixtureIds: unique(capability.serviceRefs.map((service) => service.integration?.fixtureSeedId).filter(Boolean)),
      enterpriseControlIds: controlIdsForDomain(capability.domain),
      riskIds: riskIdsForDomain(capability.domain),
      machineQaStatus: store.latestMachineRun.failCount > 0 ? "machine-fail" : "machine-reviewable",
      humanReviewStatus: "human-review-required",
      staleState: "fresh-at-source-sha",
      blockedState: "not-blocked-by-machine; final human signoff still required",
      remainsUnclaimed: "Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full product readiness, and USF-290 completion remain unclaimed.",
    };
  });
  const serviceClaims = services.map((service) => ({
    id: `claim-service-${service.serviceId}`,
    claimType: "service-evidence",
    what: `${service.displayName ?? service.serviceId} has a displayed Composed Service screenshot or safe screenshot-equivalent evidence record.`,
    why: "Service-backed claims must not pass without visible service evidence, authentication boundary, redaction status, synthetic-data confirmation, and human-review status.",
    when: store.latestMachineRun.generatedAt,
    where: `/proof/services/${service.serviceId}`,
    how: "Derived from the service catalogue, composed integration matrix, and screenshot-equivalent manifest.",
    whoOrWhat: "USF proof cockpit data builder and machine QA executor",
    sourceSha,
    deploymentSha,
    runId,
    semanticDefinitionId: "service-catalogue",
    capabilityId: "service-catalogue",
    serviceIds: [service.serviceId],
    routeIds: [`/proof/services/${service.serviceId}`],
    portIds: portIdsForServices([service]),
    adapterIds: adapterIdsForServices([service]),
    providerIds: providerIdsForServices([service]),
    commandIds: [service.integration?.proofCommand].filter(Boolean),
    proofIds: [service.integration?.proofScript, service.integration?.testSuitePath].filter(Boolean),
    evidenceIds: [`evidence-service-${service.serviceId}`],
    screenshotIds: [`screenshot-service-${service.serviceId}`],
    auditIds: [`audit-service-${service.serviceId}`],
    logMetricTraceAlertIds: [`observability-service-${service.serviceId}`, `alert-service-${service.serviceId}`],
    fixtureIds: [service.integration?.fixtureSeedId].filter(Boolean),
    enterpriseControlIds: ["control-service-evidence", "control-evidence-integrity"],
    riskIds: ["risk-service-evidence-gap", "risk-stale-evidence"],
    machineQaStatus: "machine-reviewable",
    humanReviewStatus: "human-review-required",
    staleState: "fresh-at-source-sha",
    blockedState: "not-blocked-by-machine; direct screenshots may require human review or safe login",
    remainsUnclaimed: "Service evidence supports review only; it does not claim service production readiness or live-provider readiness.",
  }));
  const foundationClaim = {
    id: "claim-foundation-substrate-closure",
    claimType: "foundation-substrate-closure",
    what: foundationClosure.importRecord?.boundedClaimImportedForReview ?? "USF current-state foundation substrate closure is imported for staging proof review.",
    why: "Staging proof review depends on current-state foundation closure being visible before capability evidence is asserted.",
    when: store.latestMachineRun.generatedAt,
    where: "/proof/foundation-substrate-closure",
    how: "Imported from USF-292 closure artefacts, sealed provenance pointer, and foundation closure validator evidence.",
    whoOrWhat: "USF foundation closure import and proof cockpit validator",
    sourceSha,
    deploymentSha,
    runId,
    semanticDefinitionId: "foundation-substrate-closure",
    capabilityId: "aggregate-foundation-substrate-closure",
    serviceIds: ["public-proof-origin", "caddy", "postgres", "grafana", "loki", "prometheus", "otel-collector"],
    routeIds: ["/proof/foundation-substrate-closure"],
    portIds: [],
    adapterIds: ["foundation-closure-validator"],
    providerIds: ["repository-evidence"],
    commandIds: [FOUNDATION_CLOSURE_VALIDATOR_COMMAND.join(" ")],
    proofIds: ["USF-292", "USF-291", "USF-290"],
    evidenceIds: ["usf-foundation-substrate-closure"],
    screenshotIds: ["screenshot-route-proof-foundation-substrate-closure"],
    auditIds: ["audit-foundation-substrate-closure"],
    logMetricTraceAlertIds: ["observability-foundation-substrate-closure"],
    fixtureIds: ["synthetic-foundation-review"],
    enterpriseControlIds: ["control-evidence-integrity", "control-secure-development-change-governance"],
    riskIds: ["risk-historical-lineage-overclaim", "risk-generated-report-overclaim"],
    machineQaStatus: "machine-reviewable",
    humanReviewStatus: "human-review-required",
    staleState: "fresh-at-source-sha",
    blockedState: "not-blocked-by-machine; final Matthew acceptance remains separate",
    remainsUnclaimed: "USF-290 completion remains unclaimed and cannot be inferred from foundation closure.",
  };
  const portfolioClaim = {
    id: "claim-proof-cockpit-portfolio",
    claimType: "portfolio-completeness",
    what: "The proof cockpit exposes routes for portfolio, claims, semantic definitions, capabilities, services, screenshots, evidence, machine runs, import, review, reports, audit, observability, alerts, fixtures, enterprise domains, foundation closure, signoff, and result.",
    why: "External auditors need a complete navigable evidence portfolio rather than scattered generated reports.",
    when: store.latestMachineRun.generatedAt,
    where: "/proof/portfolio",
    how: "Data-driven route manifest, source viewer, final report, machine QA, and proof cockpit validator.",
    whoOrWhat: "USF proof cockpit route manifest and validator",
    sourceSha,
    deploymentSha,
    runId,
    semanticDefinitionId: "proof-cockpit-machine-qa-evidence-model",
    capabilityId: "proof-cockpit",
    serviceIds: services.map((service) => service.serviceId),
    routeIds: ROUTES,
    portIds: portIdsForServices(services),
    adapterIds: adapterIdsForServices(services),
    providerIds: providerIdsForServices(services),
    commandIds: ["corepack pnpm proof-cockpit:machine-qa", "corepack pnpm proof-cockpit:validate"],
    proofIds: ["USF-293", "USF-290"],
    evidenceIds: ["proof-cockpit-evidence-store", "proof-cockpit-final-report"],
    screenshotIds: ["screenshot-route-proof", "screenshot-route-proof-portfolio", "screenshot-route-proof-reports-final"],
    auditIds: ["audit-proof-cockpit"],
    logMetricTraceAlertIds: ["observability-proof-cockpit", "alert-proof-cockpit"],
    fixtureIds: ["synthetic-proof-cockpit-review"],
    enterpriseControlIds: ["control-evidence-integrity", "control-management-review"],
    riskIds: ["risk-evidence-omission", "risk-human-signoff-overclaim"],
    machineQaStatus: "machine-reviewable",
    humanReviewStatus: "human-review-required",
    staleState: "fresh-at-source-sha",
    blockedState: "not-blocked-by-machine; final signoff disabled",
    remainsUnclaimed: "The cockpit is an assurance review surface and does not claim product UI readiness or staging readiness.",
  };
  return [portfolioClaim, foundationClaim, ...capabilityClaims, ...serviceClaims];
}

function buildEnterpriseDomains(claims) {
  return ENTERPRISE_TOPICS.map(([slug, title, purpose]) => ({
    slug,
    title,
    purpose,
    claimIds: claims
      .filter((claim) =>
        [...(claim.enterpriseControlIds ?? []), ...(claim.riskIds ?? [])].some((id) => id.includes(slug) || id.includes(slug.replace(/-/g, ""))),
      )
      .slice(0, 20)
      .map((claim) => claim.id),
    owner: `${slug}-owner`,
    validationMethod: "proof-cockpit-machine-qa plus human review",
    result: "human-review-required",
    residualRisk: "visible for human acceptance; not a readiness or certification claim",
    reviewCadence: "before final acceptance and after source/deployment change",
    humanReviewStatus: "human-review-required",
    nonClaimBoundary: "ISO-style support only; no ISO certification, SOC readiness, enterprise production readiness, or staging readiness claim.",
  }));
}

function runFoundationClosureValidatorCheck() {
  try {
    const output = execFileSync(FOUNDATION_CLOSURE_VALIDATOR_COMMAND[0], FOUNDATION_CLOSURE_VALIDATOR_COMMAND.slice(1), {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 20000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      status: "pass",
      command: FOUNDATION_CLOSURE_VALIDATOR_COMMAND.join(" "),
      detail: output.trim(),
    };
  } catch (error) {
    return {
      status: "local-check-unavailable-or-fail",
      command: FOUNDATION_CLOSURE_VALIDATOR_COMMAND.join(" "),
      detail: String(error.stderr || error.stdout || error.message || "validator check unavailable").slice(0, 1200),
    };
  }
}

function parseMatrixCapabilities() {
  const matrix = readFileSync(MATRIX_PATH, "utf8");
  const capabilitySection = matrix
    .split("## Capability Matrix")[1]
    ?.split("\n## ")[0];
  if (!capabilitySection) {
    throw new Error("proof-cockpit-capability-matrix-section-missing");
  }
  return capabilitySection
    .split("\n")
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => {
      const [number, domain, capability, slice, semanticTarget, requiredFollowUp, evidenceSummary] =
        splitMarkdownRow(line);
      const rowNumber = Number(number);
      const capabilityId = `cap-${String(rowNumber).padStart(3, "0")}-${slugify(capability)}`;
      const contractMatch = String(semanticTarget).match(/semantic-contract\.([a-z0-9-]+)/);
      const semanticContractId = contractMatch ? `semantic-contract.${contractMatch[1]}` : "";
      const proofTokens = [...String(evidenceSummary).matchAll(/proof=([^|]+)/g)]
        .flatMap((match) => String(match[1]).split(";"))
        .map((token) => token.trim())
        .filter(Boolean);
      return {
        rowNumber,
        id: capabilityId,
        domain: stripBackticks(domain),
        name: capability,
        slice: stripBackticks(slice),
        semanticTarget: stripBackticks(semanticTarget),
        semanticContractId,
        requiredFollowUp,
        evidenceSummary,
        proofTokens,
      };
    });
}

function loadSemanticContracts() {
  const entries = new Map();
  for (const fileName of readdirSync(CONTRACT_DIR).filter((name) => name.endsWith(".json"))) {
    const path = join(CONTRACT_DIR, fileName);
    const data = JSON.parse(readFileSync(path, "utf8"));
    entries.set(data.id, {
      id: data.id,
      title: data.title,
      capability: data.capability,
      domain: data.capabilityDomain,
      lifecycleState: data.lifecycleState,
      path: `spec/instances/semantic-contract/${fileName}`,
      sourceRefs: data.sourceRefs ?? [],
      facets: data.facets ?? {},
    });
  }
  return entries;
}

function loadServices() {
  const catalogue = readJsonOrNull(SERVICE_CATALOGUE_PATH) ?? {};
  const integrationMatrix = readJsonOrNull(COMPOSED_SERVICE_MATRIX_PATH) ?? {};
  const integrationRows = new Map(
    (integrationMatrix.serviceIntegrationRows ?? []).map((row) => [row.serviceCatalogueId ?? row.serviceId, row]),
  );
  const services = (catalogue.services ?? []).map((service) => {
    const integration = integrationRows.get(service.serviceId) ?? {};
    const profileNames = [
      ...new Set([...(service.composeProfiles ?? []), ...(integration.composeProfiles ?? [])].filter(Boolean)),
    ].sort();
    return {
      ...service,
      integration,
      profileNames,
      firstPassClickThroughState: integration.proofCommand ? "catalogue-linked" : "needs-runtime-wiring",
    };
  });
  return {
    services,
    servicesById: new Map(services.map((service) => [service.serviceId, service])),
    profileRows: integrationMatrix.profileIntegrationRows ?? [],
  };
}

export function buildData() {
  const contracts = loadSemanticContracts();
  const serviceCatalogue = loadServices();
  const foundationClosure = loadFoundationClosureEvidence();
  const capabilities = parseMatrixCapabilities().map((capability) => {
    const contract = contracts.get(capability.semanticContractId);
    const serviceRefs = servicesForCapability(capability, serviceCatalogue.servicesById);
    const scenarioIds = [`${capability.id}-happy-path`, `${capability.id}-negative-path`];
    const evidenceIds = [`${capability.id}-semantic-contract`, `${capability.id}-runtime-evidence`];
    return {
      ...capability,
      contract,
      firstPassState: contract ? "portfolio-listed" : "human-review-required",
      scenarioIds,
      evidenceIds,
      signoffState: "human-review-required",
      roles: rolesForDomain(capability.domain),
      serviceRefs,
      serviceNames: DOMAIN_SERVICES[capability.domain] ?? ["backing services not classified in final cockpit"],
    };
  });
  const scenarios = new Map();
  const evidence = new Map();
  for (const capability of capabilities) {
    scenarios.set(capability.scenarioIds[0], {
      id: capability.scenarioIds[0],
      capabilityId: capability.id,
      name: `${capability.name} happy path`,
      pathType: "happy path",
      role: capability.roles[0] ?? ROLES[1],
      expectedResult: "Human-review-required for the successful staging exercise path.",
    });
    scenarios.set(capability.scenarioIds[1], {
      id: capability.scenarioIds[1],
      capabilityId: capability.id,
      name: `${capability.name} negative path`,
      pathType: "negative path",
      role: "anonymous visitor denial persona",
      expectedResult: "Human-review-required for denied, invalid, tenant mismatch, degraded, or timeout behaviour.",
    });
    evidence.set(capability.evidenceIds[0], {
      id: capability.evidenceIds[0],
      capabilityId: capability.id,
      title: "Semantic contract link",
      status: capability.contract ? "available-repository-link" : "missing",
      target: capability.contract?.path ?? capability.semanticTarget,
    });
    evidence.set(capability.evidenceIds[1], {
      id: capability.evidenceIds[1],
      capabilityId: capability.id,
      title: "Runtime staging evidence mapping",
      status: "human-review-required",
      target: "runtime route/API, audit, logs, metrics, traces, alerts, screenshots, and immutable artifact require human review before acceptance",
    });
  }
  evidence.set("usf-foundation-substrate-closure", {
    id: "usf-foundation-substrate-closure",
    capabilityId: "aggregate-foundation-substrate-closure",
    title: "USF foundation substrate closure evidence",
    status:
      foundationClosure.importRecord?.validatorEvidence?.allResult === "pass"
        ? "validator-pass"
        : "available-repository-link",
    target: FOUNDATION_CLOSURE_IMPORT_SOURCE,
    proofRoute: "/proof/foundation-substrate-closure",
  });
  evidence.set("proof-cockpit-evidence-store", {
    id: "proof-cockpit-evidence-store",
    capabilityId: "proof-cockpit",
    title: "Persistent staging evidence store",
    status: "available-repository-link",
    target: "evidence/proof-evidence/proof-cockpit/staging-evidence-store.json",
    proofRoute: "/proof/portfolio",
  });
  evidence.set("proof-cockpit-final-report", {
    id: "proof-cockpit-final-report",
    capabilityId: "proof-cockpit",
    title: "Final external-review report",
    status: "available-repository-link",
    target: "evidence/proof-evidence/proof-cockpit/final-external-review-report.md",
    proofRoute: "/proof/reports/final",
  });
  for (const service of serviceCatalogue.services) {
    evidence.set(`evidence-service-${service.serviceId}`, {
      id: `evidence-service-${service.serviceId}`,
      capabilityId: "service-catalogue",
      serviceId: service.serviceId,
      title: `${service.displayName ?? service.serviceId} service evidence`,
      status: "screenshot-equivalent-available",
      target: `evidence/proof-evidence/proof-cockpit/staging-evidence-store.json#service-evidence-${service.serviceId}`,
      proofRoute: `/proof/services/${service.serviceId}`,
    });
  }
  const persistentEvidence = loadPersistentEvidenceStore();
  const claims = buildClaims(capabilities, serviceCatalogue.services, foundationClosure, persistentEvidence);
  const screenshots = buildScreenshotRecords(capabilities, serviceCatalogue.services, persistentEvidence);
  const enterpriseDomains = buildEnterpriseDomains(claims);
  return {
    capabilities,
    contracts,
    semanticDefinitions: [...contracts.values()],
    scenarios,
    evidence,
    foundationClosure,
    persistentEvidence,
    claims,
    claimsById: new Map(claims.map((claim) => [claim.id, claim])),
    screenshots,
    screenshotsById: new Map(screenshots.map((screenshot) => [screenshot.id, screenshot])),
    enterpriseDomains,
    ...serviceCatalogue,
  };
}

export function getProofCockpitManifest() {
  return {
    issueId: LINEAR_ISSUE,
    routes: [...ROUTES],
    routeSummaries: ROUTE_SUMMARIES.map(([route, delivers, humanAction, evidence]) => ({
      route,
      delivers,
      humanAction,
      evidence,
    })),
    roles: [...ROLES],
    nonClaims: [...NON_CLAIMS],
    enterpriseTopics: ENTERPRISE_TOPICS.map(([slug, title, purpose]) => ({ slug, title, purpose })),
    enterpriseDomainAliases: { ...ENTERPRISE_DOMAIN_ALIASES },
    sourceDocuments: SOURCE_DOCUMENTS.map(([title, path]) => ({ title, path })),
    actionTypes: [...QA_ACTION_TYPES],
    qaOutcomes: [...QA_OUTCOMES],
  };
}

function servicesForCapability(capability, servicesById) {
  const ids = DOMAIN_SERVICE_IDS[capability.domain] ?? [];
  return ids.map((id) => servicesById.get(id)).filter(Boolean);
}

function rolesForDomain(domain) {
  const base = {
    "identity-access": ["tenant admin", "delegated admin", "auditor", "break-glass operator"],
    authentication: ["anonymous visitor denial persona", "authenticated user", "tenant admin", "platform operator"],
    "entitlements-billing": ["billing admin", "tenant admin", "auditor"],
    "data-platform": ["tenant admin", "platform operator", "auditor"],
    "events-workflow": ["developer", "platform operator", "support operator"],
    "observability-ops": ["platform operator", "support operator", "auditor", "read-only observer"],
    "security-governance": ["platform operator", "auditor", "break-glass operator"],
    "developer-platform": ["developer", "platform operator", "tenant admin"],
    "support-admin": ["support operator", "tenant admin", "auditor"],
  };
  return base[domain] ?? ["tenant member", "tenant admin", "platform operator", "auditor"];
}

function getSourceSha() {
  if (process.env.USF_SOURCE_SHA) {
    return process.env.USF_SOURCE_SHA;
  }
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unavailable";
  }
}

function layout(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body{margin:0;font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#1f2328;background:#f7f7f5}
header,footer{background:#ffffff;border-bottom:1px solid #d8d8d2;padding:16px 20px}
footer{border-top:1px solid #d8d8d2;border-bottom:0;margin-top:24px}
main{max-width:1180px;margin:0 auto;padding:18px 20px 40px}
nav{display:flex;flex-wrap:wrap;gap:8px 12px;margin-top:10px}
nav a,a{color:#0b5cad}
section{margin:18px 0;padding:16px 0;border-top:1px solid #d8d8d2}
table{width:100%;border-collapse:collapse;background:#fff;margin:10px 0;overflow-wrap:anywhere}
th,td{border:1px solid #d8d8d2;padding:8px;text-align:left;vertical-align:top}
th{background:#eeeeea}
pre{white-space:pre-wrap;background:#fff;border:1px solid #d8d8d2;padding:12px;overflow:auto}
input,select,textarea,button{font:inherit;max-width:100%}
button{padding:8px 12px;border:1px solid #525252;background:#fff}
.badge{display:inline-block;border:1px solid #b8b8b2;padding:2px 6px;border-radius:4px;background:#fff}
@media(max-width:760px){main,header,footer{padding-left:12px;padding-right:12px}table{display:block;overflow-x:auto}th,td{min-width:140px}}
@media print{nav,form,button{display:none}body{background:#fff}main{max-width:none}}
</style>
</head>
<body>
<header>
<h1>${escapeHtml(title)}</h1>
<nav>
<a href="/proof">Home</a> |
<a href="/proof/portfolio">Portfolio</a> |
<a href="/proof/claims">Claims</a> |
<a href="/proof/semantic-definitions">Semantic definitions</a> |
<a href="/proof/qa">QA</a> |
<a href="/proof/foundation-substrate-closure">Foundation substrate closure</a> |
<a href="/proof/actions">Actions</a> |
<a href="/proof/reports/final">Final report</a> |
<a href="/proof/capabilities">Capabilities</a> |
<a href="/proof/services">Services</a> |
<a href="/proof/screenshots">Screenshots</a> |
<a href="/proof/evidence">Evidence</a> |
<a href="/proof/sources">Sources</a> |
<a href="/proof/roles">Roles</a> |
<a href="/proof/audit">Audit</a> |
<a href="/proof/observability">Observability</a> |
<a href="/proof/fixtures">Fixtures</a> |
<a href="/proof/alerts">Alerts</a> |
<a href="/proof/signoff">Signoff</a> |
<a href="/proof/result">Result</a> |
<a href="/proof/enterprise">Enterprise</a> |
<a href="/proof/runbook">Runbook</a>
</nav>
</header>
<main>
${body}
</main>
<footer>
<h2>Global non-claim boundary</h2>
<p>This proof cockpit does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.</p>
</footer>
</body>
</html>
`;
}

function warningsBlock() {
  return `<section>
<h2>Warnings</h2>
<ul>
<li>This is an acceptance-grade staging proof cockpit deliverable for machine evidence review, selective human assertion, and external audit-style review.</li>
<li>It does not auto-complete ${ACCEPTANCE_ISSUE}; Matthew's final human acceptance remains a separate recorded decision.</li>
<li>SSO enforcement is not wired in this local controlled proof route. Staging exposure must put this route behind the authorised staging SSO boundary before any real use.</li>
<li>Warnings, gaps, stale evidence, rejected evidence, corrective actions, and retest requests remain visible; none are hidden or silently accepted.</li>
<li>USF-289 is complete in live Linear, but live origin and deployment metadata remain evidence inputs only and do not upgrade readiness claims.</li>
</ul>
</section>`;
}

function nonClaimsBlock() {
  return `<section>
<h2>Non-claims</h2>
<ul>${NON_CLAIMS.map((claim) => `<li>${escapeHtml(claim)}</li>`).join("")}</ul>
</section>`;
}

function table(headers, rows) {
  return `<table>
<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
<tbody>${rows.join("")}</tbody>
</table>`;
}

function orderedList(items) {
  return `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
}

function unorderedList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function textInput(name, label, value = "") {
  return `<p><label>${escapeHtml(label)} <input name="${escapeHtml(name)}" value="${escapeHtml(value)}"></label></p>`;
}

function hiddenInput(name, value = "") {
  return `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`;
}

function textArea(name, label, value = "") {
  return `<p><label>${escapeHtml(label)}<br><textarea name="${escapeHtml(name)}" rows="4" cols="80">${escapeHtml(value)}</textarea></label></p>`;
}

function selectInput(name, label, options, selected = "") {
  return `<p><label>${escapeHtml(label)} <select name="${escapeHtml(name)}">${options
    .map((option) => {
      const isSelected = option === selected ? " selected" : "";
      return `<option value="${escapeHtml(option)}"${isSelected}>${escapeHtml(option)}</option>`;
    })
    .join("")}</select></label></p>`;
}

function checkboxInput(name, label) {
  return `<p><label><input type="checkbox" name="${escapeHtml(name)}" value="yes"> ${escapeHtml(label)}</label></p>`;
}

function actionForm(context = {}) {
  return `<form method="post" action="/proof/actions">
${hiddenInput("returnTo", context.returnTo ?? "/proof/actions")}
${hiddenInput("capabilityId", context.capabilityId ?? "")}
${hiddenInput("serviceId", context.serviceId ?? "")}
${hiddenInput("scenarioId", context.scenarioId ?? "")}
${hiddenInput("evidenceId", context.evidenceId ?? "")}
${hiddenInput("enterpriseTopic", context.enterpriseTopic ?? "")}
${selectInput("actionType", "Action type", QA_ACTION_TYPES, context.actionType ?? "capability-qa")}
${selectInput("outcome", "Current outcome", QA_OUTCOMES, context.outcome ?? "draft-performed")}
${selectInput("role", "QA role used", ROLES, context.role ?? "auditor")}
${textInput("actor", "Human operator or auditor", context.actor ?? "")}
${textInput("tenant", "Synthetic tenant or scope", context.tenant ?? "")}
${textInput("actionName", "Action performed", context.actionName ?? "")}
${textInput("correlationId", "Correlation id", context.correlationId ?? "")}
${textInput("traceId", "Trace id", context.traceId ?? "")}
${textInput("auditEventId", "Audit event id", context.auditEventId ?? "")}
${textInput("evidenceUrl", "Evidence URL", context.evidenceUrl ?? "")}
${textInput("sourceUrl", "Source or document URL", context.sourceUrl ?? "")}
${textInput("serviceUrl", "Service click-through URL", context.serviceUrl ?? "")}
${textInput("screenshotUrl", "Screenshot or artifact URL", context.screenshotUrl ?? "")}
${checkboxInput("devEvidenceConfirmed", "I confirmed the relevant dev-readiness prerequisite evidence.")}
${checkboxInput("testEvidenceConfirmed", "I confirmed the relevant test-readiness prerequisite evidence.")}
${checkboxInput("noRealTenantData", "This action used no real tenant data, real secrets, or private local state.")}
${checkboxInput("nonClaimsConfirmed", "This action makes no staging, production, SOC, ISO, enterprise-readiness, product UI, browser E2E, or full Foundation closure claim.")}
${textArea("notes", "Notes, blockers, corrections, or human observation", context.notes ?? "")}
<p><button type="submit">Record QA action</button></p>
</form>`;
}

function serviceLink(service) {
  return `<a href="/proof/services/${escapeHtml(service.serviceId)}">${escapeHtml(service.displayName ?? service.serviceId)}</a>`;
}

function serviceSummary(service) {
  const integration = service.integration ?? {};
  return [
    serviceLink(service),
    `profiles: ${(service.profileNames ?? []).join(", ") || "human-review-required"}`,
    `claim: ${integration.testReadinessClaimAllowed ?? "unknown"}`,
    `state: ${service.firstPassClickThroughState}`,
  ].join(" - ");
}

function capabilityQaEvidenceRows(capability) {
  const rows = [
    ["Semantic contract", capability.contract?.path ?? capability.semanticTarget, capability.contract ? "repository-link" : "missing"],
    ["Route or API", capability.evidenceSummary, "needs-runtime-wiring"],
    ["Service click-through", `${capability.serviceRefs.length} linked service rows`, capability.serviceRefs.length ? "catalogue-linked" : "human-review-required"],
    ["Happy path", capability.scenarioIds[0], "human-review-required"],
    ["Negative path", capability.scenarioIds[1], "human-review-required"],
    ["Audit", "actor, tenant, action, result, timestamp, correlation id", "human-review-required"],
    ["Observability", "trace id, log, metric, dashboard or runbook link", "human-review-required"],
    ["Alert", "alert name, condition, route/service, evidence link", "human-review-required"],
    ["Fixture lifecycle", "seed, reset, cleanup, teardown, residual-state evidence", "human-review-required"],
    ["Screenshot or artifact", "immutable artifact link and source SHA", "human-review-required"],
    ["Human signoff", "Matthew confirmation after final proofing", "final-signoff-disabled-until-human-acceptance"],
  ];
  return rows.map(
    ([artifact, required, state]) =>
      `<tr><td>${escapeHtml(artifact)}</td><td>${escapeHtml(required)}</td><td>${escapeHtml(state)}</td></tr>`,
  );
}

function proofLadderRows(capability) {
  return PROOF_LADDER_LEVELS.map(([level, source, auditorAction, state]) => {
    const resolvedSource = source === "/proof/capabilities/:capabilityId" ? `/proof/capabilities/${capability.id}` : source;
    return `<tr>
<td>${escapeHtml(level)}</td>
<td>${sourcePathCell(resolvedSource)}</td>
<td>${escapeHtml(auditorAction)}</td>
<td>${escapeHtml(state)}</td>
</tr>`;
  });
}

function machineProofWorkRows() {
  return MACHINE_PROOF_WORK_MAP.map(
    ([proofArea, issue, evidenceSource, auditorWork]) =>
      `<tr>
<td>${escapeHtml(proofArea)}</td>
<td>${escapeHtml(issue)}</td>
<td>${sourcePathCell(evidenceSource)}</td>
<td>${escapeHtml(auditorWork)}</td>
</tr>`,
  );
}

function enterpriseRequirementRows() {
  return ENTERPRISE_STAGING_REQUIREMENTS.map(
    ([requirement, evidence, route]) =>
      `<tr>
<td>${escapeHtml(requirement)}</td>
<td>${escapeHtml(evidence)}</td>
<td><a href="${escapeHtml(route)}">${escapeHtml(route)}</a></td>
<td>human-review-required</td>
</tr>`,
  );
}

function isoSupportRows(topicId) {
  return ISO_SUPPORT_FIELDS.map(
    (field) =>
      `<tr>
<td>${escapeHtml(field)}</td>
<td>${escapeHtml(topicId)}</td>
<td>human-review-required</td>
<td>required before formal enterprise evidence acceptance</td>
</tr>`,
  );
}

function stagingProofUiRows() {
  return STAGING_PROOF_UI_REQUIREMENTS.map(
    ([area, fields, route]) =>
      `<tr><td>${escapeHtml(area)}</td><td>${escapeHtml(fields)}</td><td>${routeToLink(route)}</td><td>acceptance-grade-review-surface</td></tr>`,
  );
}

function roleChecklistRows(capability) {
  return capability.roles.map((role) => `<tr>
<td>${escapeHtml(role)}</td>
<td>Perform role-appropriate happy path for ${escapeHtml(capability.name)} with synthetic tenant context.</td>
<td>Perform denial, escalation, tenant mismatch, invalid input, or read-only check appropriate to ${escapeHtml(role)}.</td>
<td>Capture actor role, tenant, action, result, audit id, correlation id, trace id, service state, and screenshot artifact.</td>
<td><label><input type="checkbox" disabled> ${escapeHtml(role)} QA not performed in final cockpit</label></td>
</tr>`);
}

function routeSummaryRows() {
  return ROUTE_SUMMARIES.map(
    ([route, delivers, humanAction, evidence]) =>
      `<tr><td>${routeToLink(route)}</td><td>${escapeHtml(delivers)}</td><td>${escapeHtml(humanAction)}</td><td>${escapeHtml(evidence)}</td></tr>`,
  );
}

function listLinks(items, prefix = "") {
  const values = (items ?? []).filter(Boolean);
  if (!values.length) {
    return "none";
  }
  return `<ul>${values
    .map((item) => {
      const href = prefix ? `${prefix}${encodeURIComponent(item)}` : "";
      return `<li>${href ? `<a href="${escapeHtml(href)}">${escapeHtml(item)}</a>` : escapeHtml(item)}</li>`;
    })
    .join("")}</ul>`;
}

function claimLink(claimId) {
  return `<a href="/proof/claims/${escapeHtml(claimId)}">${escapeHtml(claimId)}</a>`;
}

function semanticDefinitionLink(definitionId) {
  return `<a href="/proof/semantic-definitions/${escapeHtml(definitionId)}">${escapeHtml(definitionId)}</a>`;
}

function screenshotLink(screenshotId) {
  return `<a href="/proof/screenshots/${escapeHtml(screenshotId)}">${escapeHtml(screenshotId)}</a>`;
}

function evidenceLink(evidenceId) {
  return `<a href="/proof/evidence/${escapeHtml(evidenceId)}">${escapeHtml(evidenceId)}</a>`;
}

function claimRows(claims, limit = claims.length) {
  return claims.slice(0, limit).map((claim) => `<tr>
<td>${claimLink(claim.id)}</td>
<td>${escapeHtml(claim.claimType)}</td>
<td>${escapeHtml(claim.what)}</td>
<td>${escapeHtml(claim.machineQaStatus)}</td>
<td>${escapeHtml(claim.humanReviewStatus)}</td>
<td>${escapeHtml(claim.staleState)}</td>
</tr>`);
}

function semanticDefinitionRows(data) {
  return data.semanticDefinitions.map((definition) => {
    const claims = data.claims.filter((claim) => claim.semanticDefinitionId === definition.id);
    const capability = data.capabilities.find((candidate) => candidate.semanticContractId === definition.id);
    return `<tr>
<td>${semanticDefinitionLink(definition.id)}</td>
<td>${escapeHtml(definition.title ?? definition.capability ?? definition.id)}</td>
<td>${sourcePathCell(definition.path)}</td>
<td>${capability ? `<a href="/proof/capabilities/${escapeHtml(capability.id)}">${escapeHtml(capability.id)}</a>` : "human-review-required"}</td>
<td>${claims.length}</td>
<td>${escapeHtml(definition.lifecycleState ?? "unknown")}</td>
</tr>`;
  });
}

function screenshotRows(screenshots, limit = screenshots.length) {
  return screenshots.slice(0, limit).map((screenshot) => `<tr>
<td>${screenshotLink(screenshot.id)}</td>
<td>${escapeHtml(screenshot.kind)}</td>
<td>${escapeHtml(screenshot.serviceId ?? screenshot.route ?? "")}</td>
<td>${escapeHtml(screenshot.screenshotPath)}</td>
<td>${escapeHtml(screenshot.screenshotHash)}</td>
<td>${escapeHtml(screenshot.humanReviewStatus)}</td>
</tr>`);
}

function persistentStorageRows(store) {
  return Object.entries(store.storageModel).map(
    ([key, value]) => `<tr><th>${escapeHtml(titleCase(key))}</th><td>${escapeHtml(value)}</td></tr>`,
  );
}

function proofLadderFullRows() {
  return PROOF_LADDER_LEVELS.map(([stage, source, action, status]) => `<tr>
<td>${escapeHtml(stage)}</td>
<td>${sourcePathCell(source)}</td>
<td>${escapeHtml(FOUNDATION_CLOSURE_VALIDATOR_COMMAND.join(" "))}</td>
<td>${escapeHtml(action)}</td>
<td>${escapeHtml(status)}</td>
<td>${escapeHtml(status.includes("human") ? "human review/signoff remains required" : "none open in machine evidence")}</td>
<td>${escapeHtml(status.includes("complete") ? "may feed next proof stage without readiness upgrade" : "requires human decision")}</td>
<td>${escapeHtml("no staging readiness, production readiness, SOC readiness, ISO certification, or USF-290 completion claim")}</td>
</tr>`);
}

function recentActionRows(state, limit = 12) {
  const actions = [...state.actions].slice(0, limit);
  if (!actions.length) {
    return [`<tr><td colspan="7">No QA actions recorded yet.</td></tr>`];
  }
  return actions.map((action) => `<tr>
<td><a href="/proof/actions/${escapeHtml(action.id)}">${escapeHtml(action.id)}</a></td>
<td>${escapeHtml(action.createdAt)}</td>
<td>${escapeHtml(action.actionType)}</td>
<td>${escapeHtml(action.capabilityId || action.serviceId || action.scenarioId || action.enterpriseTopic || "general")}</td>
<td>${escapeHtml(action.role)}</td>
<td>${escapeHtml(action.outcome)}</td>
<td>${escapeHtml(action.actor || "missing")}</td>
</tr>`);
}

function recordedActionCountFor(state, predicate) {
  return state.actions.filter(predicate).length;
}

function normalizeAction(params) {
  const actionType = QA_ACTION_TYPES.includes(params.get("actionType")) ? params.get("actionType") : "capability-qa";
  const outcome = QA_OUTCOMES.includes(params.get("outcome")) ? params.get("outcome") : "needs-review";
  const role = ROLES.includes(params.get("role")) ? params.get("role") : "auditor";
  const now = new Date().toISOString();
  return {
    id: `qa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
    sourceSha: getSourceSha(),
    actionType,
    outcome,
    role,
    actor: String(params.get("actor") ?? "").slice(0, 160),
    tenant: String(params.get("tenant") ?? "").slice(0, 160),
    actionName: String(params.get("actionName") ?? "").slice(0, 240),
    capabilityId: String(params.get("capabilityId") ?? "").slice(0, 160),
    serviceId: String(params.get("serviceId") ?? "").slice(0, 160),
    scenarioId: String(params.get("scenarioId") ?? "").slice(0, 200),
    evidenceId: String(params.get("evidenceId") ?? "").slice(0, 200),
    enterpriseTopic: String(params.get("enterpriseTopic") ?? "").slice(0, 160),
    correlationId: String(params.get("correlationId") ?? "").slice(0, 200),
    traceId: String(params.get("traceId") ?? "").slice(0, 200),
    auditEventId: String(params.get("auditEventId") ?? "").slice(0, 200),
    evidenceUrl: String(params.get("evidenceUrl") ?? "").slice(0, 500),
    sourceUrl: String(params.get("sourceUrl") ?? "").slice(0, 500),
    serviceUrl: String(params.get("serviceUrl") ?? "").slice(0, 500),
    screenshotUrl: String(params.get("screenshotUrl") ?? "").slice(0, 500),
    notes: String(params.get("notes") ?? "").slice(0, 4000),
    confirmations: {
      devEvidenceConfirmed: params.has("devEvidenceConfirmed"),
      testEvidenceConfirmed: params.has("testEvidenceConfirmed"),
      noRealTenantData: params.has("noRealTenantData"),
      nonClaimsConfirmed: params.has("nonClaimsConfirmed"),
    },
    finalAcceptanceClaimed: false,
  };
}

function actionDetailRows(action) {
  return Object.entries({
    id: action.id,
    createdAt: action.createdAt,
    sourceSha: action.sourceSha,
    actionType: action.actionType,
    outcome: action.outcome,
    role: action.role,
    actor: action.actor,
    tenant: action.tenant,
    actionName: action.actionName,
    capabilityId: action.capabilityId,
    serviceId: action.serviceId,
    scenarioId: action.scenarioId,
    evidenceId: action.evidenceId,
    enterpriseTopic: action.enterpriseTopic,
    correlationId: action.correlationId,
    traceId: action.traceId,
    auditEventId: action.auditEventId,
    evidenceUrl: action.evidenceUrl,
    sourceUrl: action.sourceUrl,
    serviceUrl: action.serviceUrl,
    screenshotUrl: action.screenshotUrl,
    devEvidenceConfirmed: action.confirmations?.devEvidenceConfirmed,
    testEvidenceConfirmed: action.confirmations?.testEvidenceConfirmed,
    noRealTenantData: action.confirmations?.noRealTenantData,
    nonClaimsConfirmed: action.confirmations?.nonClaimsConfirmed,
    finalAcceptanceClaimed: action.finalAcceptanceClaimed,
    notes: action.notes,
  }).map(
    ([field, value]) =>
      `<tr><th>${escapeHtml(field)}</th><td>${escapeHtml(value === true ? "yes" : value === false ? "no" : value)}</td></tr>`,
  );
}

function renderHome(data, state) {
  const store = data.persistentEvidence;
  const latest = store.latestMachineRun;
  const human = store.humanReview;
  const metadata = [
    `<tr><th>Source SHA</th><td>${escapeHtml(getSourceSha())}</td></tr>`,
    `<tr><th>Environment</th><td>${escapeHtml(latest.environment)}</td></tr>`,
    `<tr><th>Deployment/run identity</th><td>${escapeHtml(latest.deploymentSha)} / ${escapeHtml(latest.runId)}</td></tr>`,
    `<tr><th>Capability rows</th><td>${data.capabilities.length}</td></tr>`,
    `<tr><th>Service evidence records</th><td>${data.services.length}</td></tr>`,
    `<tr><th>Screenshot or equivalent records</th><td>${data.screenshots.length}</td></tr>`,
    `<tr><th>Recorded QA actions</th><td>${state.actions.length}</td></tr>`,
    `<tr><th>Persistent evidence store</th><td>${sourcePathCell(store.path)}</td></tr>`,
    `<tr><th>Final report</th><td><a href="/proof/reports/final">/proof/reports/final</a> / ${sourcePathCell(store.finalReportPath)}</td></tr>`,
    `<tr><th>Related issue review</th><td>${escapeHtml(RELATED_ISSUES.join(", "))}</td></tr>`,
  ].join("");
  return layout(
    "USF staging proof cockpit",
    `<p>This audit-readable cockpit is the ${LINEAR_ISSUE} acceptance-grade review surface. It supports ${ACCEPTANCE_ISSUE} human assertion, selective review, external technical audit-style review, enterprise assurance review, and ISO 27001-style evidence support without claiming certification or readiness.</p>
${warningsBlock()}
<section>
<h2>Dashboard</h2>
${table(
      ["Metric", "Value"],
      [
        ["Latest machine QA run", latest.runId],
        ["Pass / warn / gap / fail", `${latest.passCount} / ${latest.warnCount} / ${latest.gapCount} / ${latest.failCount}`],
        ["Service evidence count", latest.serviceEvidenceCount || data.services.length],
        ["Screenshot count", latest.screenshotCount || data.screenshots.length],
        ["Human review count", state.actions.length],
        ["Accepted / rejected / retest / corrective action", `${human.accepted} / ${human.rejected} / ${human.retestRequested} / ${human.correctiveActions}`],
        ["Residual risks accepted", human.residualRisksAccepted],
        ["Final human signoff available", human.finalSignoffAvailable ? "available-after-human-review" : "not-available"],
        ["Blockers", latest.failCount > 0 ? "machine-failures-present" : "none blocking machine review; human acceptance still required"],
      ].map(([metric, value]) => `<tr><th>${escapeHtml(metric)}</th><td>${escapeHtml(value)}</td></tr>`),
    )}
</section>
<section>
<h2>Dev to Test to Staging proof ladder</h2>
${table(["Stage", "Source artifact", "Command", "Validator/evidence", "Status", "Gaps", "Handoff condition", "Non-claims"], proofLadderFullRows())}
</section>
<section>
<h2>Current metadata</h2>
<table><tbody>${metadata}</tbody></table>
</section>
<section>
<h2>Portfolio entry points</h2>
<ul>
<li><a href="/proof/portfolio">/proof/portfolio</a></li>
<li><a href="/proof/claims">/proof/claims</a></li>
<li><a href="/proof/semantic-definitions">/proof/semantic-definitions</a></li>
<li><a href="/proof/capabilities">/proof/capabilities</a></li>
<li><a href="/proof/services">/proof/services</a></li>
<li><a href="/proof/screenshots">/proof/screenshots</a></li>
<li><a href="/proof/evidence">/proof/evidence</a></li>
<li><a href="/proof/machine-runs">/proof/machine-runs</a></li>
<li><a href="/proof/reports/final">/proof/reports/final</a></li>
<li><a href="/proof/signoff">/proof/signoff</a></li>
<li><a href="/proof/result">/proof/result</a></li>
</ul>
</section>
<section>
<h2>Route map</h2>
${table(["Route", "Delivers", "Human QA action", "Required evidence"], routeSummaryRows())}
</section>
<section>
<h2>Recent QA actions</h2>
${table(["Action", "Created", "Type", "Target", "Role", "Outcome", "Actor"], recentActionRows(state, 8))}
</section>
${nonClaimsBlock()}`,
  );
}

function renderPortfolio(data, state) {
  const store = data.persistentEvidence;
  return layout(
    "Proof assurance portfolio",
    `<p>The portfolio is data-driven from semantic contracts, capability coverage, Compose service catalogue, machine QA evidence, human review actions, and durable evidence records. New semantic definitions, capabilities, services, claims, and evidence types appear through registry and catalogue updates rather than route rewrites.</p>
<section>
<h2>Portfolio counts</h2>
${table(
      ["Surface", "Count", "Entry point"],
      [
        ["Claims", data.claims.length, "/proof/claims"],
        ["Semantic definitions", data.semanticDefinitions.length, "/proof/semantic-definitions"],
        ["Capabilities", data.capabilities.length, "/proof/capabilities"],
        ["Services", data.services.length, "/proof/services"],
        ["Routes", ROUTES.length, "/proof"],
        ["Screenshot or equivalent artifacts", data.screenshots.length, "/proof/screenshots"],
        ["Evidence records", data.evidence.size, "/proof/evidence"],
        ["Enterprise domains", data.enterpriseDomains.length, "/proof/enterprise"],
        ["Human actions", state.actions.length, "/proof/actions"],
      ].map(([surface, count, route]) => `<tr><td>${escapeHtml(surface)}</td><td>${escapeHtml(count)}</td><td><a href="${escapeHtml(route)}">${escapeHtml(route)}</a></td></tr>`),
    )}
</section>
<section>
<h2>Persistent staging evidence storage model</h2>
<table><tbody>${persistentStorageRows(store).join("")}</tbody></table>
</section>
<section>
<h2>Recent claim assurance cases</h2>
${table(["Claim", "Type", "What is claimed", "Machine QA", "Human review", "Freshness"], claimRows(data.claims, 12))}
</section>
<section>
<h2>Enterprise and ISO-style support domains</h2>
${table(
      ["Domain", "Owner", "Validation method", "Result", "Residual risk", "Non-claim boundary"],
      data.enterpriseDomains.map(
        (domain) => `<tr><td><a href="/proof/enterprise/${escapeHtml(domain.slug)}">${escapeHtml(domain.title)}</a></td><td>${escapeHtml(domain.owner)}</td><td>${escapeHtml(domain.validationMethod)}</td><td>${escapeHtml(domain.result)}</td><td>${escapeHtml(domain.residualRisk)}</td><td>${escapeHtml(domain.nonClaimBoundary)}</td></tr>`,
      ),
    )}
</section>
${nonClaimsBlock()}`,
  );
}

function renderClaims(data) {
  return layout(
    "Proof claims",
    `<p>Every claim has what, why, when, where, how, who/what, source SHA, deployment/run identity, semantic definition, capability, service, route, port, adapter, provider, command, proof, evidence, screenshot, audit/observability/alert, fixture, control, risk, machine QA, human review, freshness, blocker, and unclaimed-boundary mappings.</p>
${table(["Claim", "Type", "What is claimed", "Machine QA", "Human review", "Freshness"], claimRows(data.claims))}
${nonClaimsBlock()}`,
  );
}

function renderClaim(data, state, claimId) {
  const claim = data.claimsById.get(claimId);
  if (!claim) {
    return notFound(`Claim ${claimId} was not found.`);
  }
  const recordedActions = recordedActionCountFor(state, (action) => action.evidenceId === claim.id || action.capabilityId === claim.capabilityId);
  const rows = [
    ["Claim id", claim.id],
    ["What", claim.what],
    ["Why it matters", claim.why],
    ["When proven", claim.when],
    ["Where proven", claim.where],
    ["How proven", claim.how],
    ["Who or what performed proof", claim.whoOrWhat],
    ["Source SHA", claim.sourceSha],
    ["Deployment SHA", claim.deploymentSha],
    ["Run ID", claim.runId],
    ["Semantic definition", claim.semanticDefinitionId],
    ["Capability", claim.capabilityId],
    ["Machine QA status", claim.machineQaStatus],
    ["Matthew/human review status", claim.humanReviewStatus],
    ["Stale state", claim.staleState],
    ["Blocked/superseded/retest state", claim.blockedState],
    ["What remains unclaimed", claim.remainsUnclaimed],
    ["Recorded human review actions", recordedActions],
  ].map(([field, value]) => `<tr><th>${escapeHtml(field)}</th><td>${escapeHtml(value)}</td></tr>`);
  return layout(
    `Claim ${claim.id}`,
    `<p><a href="/proof/claims">Back to claims</a></p>
<table><tbody>${rows.join("")}</tbody></table>
<section><h2>Semantic, capability, and service mappings</h2>
${table(
      ["Mapping", "Values"],
      [
        ["Semantic definition", semanticDefinitionLink(claim.semanticDefinitionId)],
        ["Capability", claim.capabilityId?.startsWith("cap-") ? `<a href="/proof/capabilities/${escapeHtml(claim.capabilityId)}">${escapeHtml(claim.capabilityId)}</a>` : escapeHtml(claim.capabilityId)],
        ["Services", listLinks(claim.serviceIds, "/proof/services/")],
        ["Routes", listLinks(claim.routeIds)],
        ["Ports", listLinks(claim.portIds)],
        ["Adapters", listLinks(claim.adapterIds)],
        ["Providers", listLinks(claim.providerIds)],
        ["Commands", listLinks(claim.commandIds)],
        ["Proofs", listLinks(claim.proofIds)],
      ].map(([field, value]) => `<tr><th>${escapeHtml(field)}</th><td>${value}</td></tr>`),
    )}
</section>
<section><h2>Evidence, screenshots, audit, observability, fixtures, controls, and risks</h2>
${table(
      ["Mapping", "Values"],
      [
        ["Evidence", listLinks(claim.evidenceIds, "/proof/evidence/")],
        ["Screenshots or equivalents", listLinks(claim.screenshotIds, "/proof/screenshots/")],
        ["Audit/log/metric/trace/alert", listLinks([...(claim.auditIds ?? []), ...(claim.logMetricTraceAlertIds ?? [])])],
        ["Fixtures/synthetic data", listLinks(claim.fixtureIds)],
        ["Enterprise controls", listLinks(claim.enterpriseControlIds)],
        ["Risks", listLinks(claim.riskIds)],
      ].map(([field, value]) => `<tr><th>${escapeHtml(field)}</th><td>${value}</td></tr>`),
    )}
</section>
<section><h2>Record human review decision</h2>
${actionForm({
      actionType: "machine-evidence-accepted",
      capabilityId: claim.capabilityId,
      evidenceId: claim.id,
      actionName: `review ${claim.id}`,
      evidenceUrl: `/proof/claims/${claim.id}`,
      returnTo: `/proof/claims/${claim.id}`,
    })}
</section>
${nonClaimsBlock()}`,
  );
}

function renderSemanticDefinitions(data) {
  return layout(
    "Proof semantic definitions",
    `<p>Semantic definitions are loaded from the semantic-contract instance registry. Each definition must map to claims and evidence; missing mappings remain visible and fail validation.</p>
${table(["Definition", "Title", "Source", "Capability", "Claim count", "Lifecycle"], semanticDefinitionRows(data))}
${nonClaimsBlock()}`,
  );
}

function renderSemanticDefinition(data, state, definitionId) {
  const definition = data.contracts.get(definitionId);
  if (!definition) {
    return notFound(`Semantic definition ${definitionId} was not found.`);
  }
  const claims = data.claims.filter((claim) => claim.semanticDefinitionId === definition.id);
  const capability = data.capabilities.find((candidate) => candidate.semanticContractId === definition.id);
  return layout(
    `Semantic definition ${definition.id}`,
    `<p><a href="/proof/semantic-definitions">Back to semantic definitions</a></p>
<table><tbody>
<tr><th>Definition id</th><td>${escapeHtml(definition.id)}</td></tr>
<tr><th>Title</th><td>${escapeHtml(definition.title ?? definition.capability ?? definition.id)}</td></tr>
<tr><th>Domain</th><td>${escapeHtml(definition.domain)}</td></tr>
<tr><th>Lifecycle</th><td>${escapeHtml(definition.lifecycleState ?? "unknown")}</td></tr>
<tr><th>Source</th><td>${sourcePathCell(definition.path)}</td></tr>
<tr><th>Capability</th><td>${capability ? `<a href="/proof/capabilities/${escapeHtml(capability.id)}">${escapeHtml(capability.id)}</a>` : "human-review-required"}</td></tr>
<tr><th>Evidence mapping</th><td>${capability ? listLinks(capability.evidenceIds, "/proof/evidence/") : "human-review-required"}</td></tr>
<tr><th>Human review actions</th><td>${recordedActionCountFor(state, (action) => action.sourceUrl === definition.path)}</td></tr>
</tbody></table>
<section><h2>Mapped claims</h2>
${table(["Claim", "Type", "What is claimed", "Machine QA", "Human review", "Freshness"], claimRows(claims))}
</section>
<section><h2>Record semantic definition review</h2>
${actionForm({
      actionType: "source-document-review",
      capabilityId: capability?.id ?? "",
      sourceUrl: definition.path,
      actionName: `review semantic definition ${definition.id}`,
      returnTo: `/proof/semantic-definitions/${definition.id}`,
    })}
</section>
${nonClaimsBlock()}`,
  );
}

function renderEvidenceIndex(data) {
  const rows = [...data.evidence.values()].map((record) => `<tr>
<td>${evidenceLink(record.id)}</td>
<td>${escapeHtml(record.title)}</td>
<td>${escapeHtml(record.status)}</td>
<td>${escapeHtml(record.capabilityId)}</td>
<td>${sourcePathCell(record.target)}</td>
<td>${record.proofRoute ? `<a href="${escapeHtml(record.proofRoute)}">${escapeHtml(record.proofRoute)}</a>` : "human-review-required"}</td>
</tr>`);
  return layout(
    "Proof evidence",
    `<p>Evidence records include source documents, service evidence, machine QA evidence store rows, final report, chain-of-custody surfaces, and human-review targets.</p>
${table(["Evidence", "Title", "Status", "Target", "Source/artifact", "Route"], rows)}
${nonClaimsBlock()}`,
  );
}

function renderScreenshots(data) {
  return layout(
    "Proof screenshots and equivalents",
    `<p>Every Composed Service used in evidence has a direct screenshot record or safe screenshot-equivalent artifact record. Equivalent records are explicit and require human review before final acceptance.</p>
${table(["Screenshot", "Kind", "Target", "Path", "Hash", "Human review"], screenshotRows(data.screenshots))}
${nonClaimsBlock()}`,
  );
}

function renderScreenshot(data, state, screenshotId) {
  const screenshot = data.screenshotsById.get(screenshotId);
  if (!screenshot) {
    return notFound(`Screenshot ${screenshotId} was not found.`);
  }
  const rows = Object.entries(screenshot).map(
    ([field, value]) => `<tr><th>${escapeHtml(field)}</th><td>${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}</td></tr>`,
  );
  return layout(
    `Screenshot ${screenshot.id}`,
    `<p><a href="/proof/screenshots">Back to screenshots</a></p>
<table><tbody>${rows.join("")}</tbody></table>
<section><h2>Record screenshot review</h2>
${actionForm({
      actionType: "evidence-review",
      serviceId: screenshot.serviceId ?? "",
      evidenceId: screenshot.id,
      screenshotUrl: screenshot.screenshotPath,
      actionName: `review ${screenshot.id}`,
      returnTo: `/proof/screenshots/${screenshot.id}`,
    })}
</section>
${nonClaimsBlock()}`,
  );
}

function finalReportSections(data, state) {
  const store = data.persistentEvidence;
  const latest = store.latestMachineRun;
  return [
    ["Executive summary", `USF-293 delivers an acceptance-grade proof cockpit over ${data.claims.length} claims, ${data.semanticDefinitions.length} semantic definitions, ${data.capabilities.length} capabilities, ${data.services.length} services, ${ROUTES.length} route patterns, ${data.screenshots.length} screenshot or equivalent artifacts, and ${data.enterpriseDomains.length} enterprise domains. Matthew's final ${ACCEPTANCE_ISSUE} acceptance remains a separate human decision.`],
    ["Scope and non-claims", `Scope is proof-cockpit assurance review and evidence portfolio presentation. Non-claims: ${NON_CLAIMS.join(", ")}.`],
    ["Current USF foundation closure posture", "USF-292 current-state foundation substrate closure is imported for review through /proof/foundation-substrate-closure and does not complete USF-290."],
    ["Dev/Test/Staging proof ladder", "The ladder shows Dev foundation, Dev Compose, Dev command/proof, Dev-to-Test handoff, Test foundation, sealed provenance, Staging machine QA, Staging service evidence, Staging human review, and Staging acceptance result."],
    ["Semantic definition portfolio", `${data.semanticDefinitions.length} semantic definitions are loaded from spec/instances/semantic-contract and mapped to claims/evidence where applicable.`],
    ["Capability portfolio", `${data.capabilities.length} capabilities are mapped to scenarios, services, evidence, controls, risks, and human review states.`],
    ["Service catalogue and Compose evidence", `${data.services.length} service catalogue rows are visible with Compose profile, proof command, fixture, ownership, and screenshot-equivalent evidence.`],
    ["Route/port/adapter/provider evidence", `${ROUTES.length} route patterns, ${portIdsForServices(data.services).length} service ports, ${adapterIdsForServices(data.services).length} adapters, and provider boundaries are exposed.`],
    ["Command/proof/validator evidence", "Machine QA, proof cockpit validation, foundation closure validation, spec, enterprise, compose, and test-readiness validators are linked through command and evidence manifests."],
    ["Screenshot inventory", `${data.screenshots.length} screenshot or screenshot-equivalent records are visible and hash-addressed through the durable evidence store.`],
    ["Machine QA method and results", `Latest run ${latest.runId}: pass ${latest.passCount}, warn ${latest.warnCount}, gap ${latest.gapCount}, fail ${latest.failCount}; route count ${latest.routeCount}.`],
    ["Human review method and status", `Human actions persist at ${data.persistentEvidence.path}. Supported decisions include accept, reject, annotate, retest, corrective action, residual-risk acceptance, and final signoff. Current action count: ${state.actions.length}.`],
    ["Claim-by-claim assurance case", "Every claim detail page shows what, why, when, where, how, actor/tool, source SHA, deployment/run identity, semantic, capability, service, route, port, adapter, provider, command, proof, evidence, screenshot, audit, observability, alert, fixture, control, risk, machine QA, human review, stale/blocker status, and unclaimed boundary."],
    ["Evidence chain of custody", "Evidence records carry source SHA, deployment SHA, run ID, timestamp, actor/tool, artifact path, content hash, screenshot hash, redaction status, synthetic-data confirmation, freshness policy, stale behaviour, and human review state."],
    ["Audit/log/metric/trace/alert coverage", "Audit, observability, and alert matrices remain visible; missing or stale records are not promoted to pass."],
    ["Fixture/synthetic data/reset coverage", "Fixture pages show synthetic dataset, seed/reset/cleanup/teardown expectations, no-real-tenant-data boundary, and service lifecycle mappings."],
    ["Enterprise/ISO-style support mapping", `${data.enterpriseDomains.length} enterprise domains map claims, evidence, screenshots/equivalents, owners, validation method, result, residual risk, cadence, human review, and non-claim boundary without certification claim.`],
    ["Risk and control mapping", "Claims map to enterprise controls and risks; residual risks require explicit human action and cannot be silently accepted."],
    ["Warnings, gaps, corrective actions, and retest status", `Latest machine run records ${latest.warnCount} warnings and ${latest.gapCount} gaps. Corrective actions recorded: ${data.persistentEvidence.humanReview.correctiveActions}. Retest requests: ${data.persistentEvidence.humanReview.retestRequested}.`],
    ["Evidence freshness and historical audit artefact retention", data.persistentEvidence.storageModel.staleEvidenceBehaviour],
    ["Human acceptance result", data.persistentEvidence.humanReview.finalSignoffCompleted ? "Final human acceptance recorded." : "Final human acceptance is not auto-completed and remains unavailable until Matthew records the required decision."],
    ["Final handoff statement", "The cockpit supports selective review and assertion. It does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full product readiness, or automatic USF-290 completion."],
  ];
}

function renderReportsIndex(data) {
  return layout(
    "Proof reports",
    `<p>Reports are generated projections over the evidence portfolio and remain lower authority than semantic definitions, validators, runtime proof evidence, source implementation, and preserved evidence records.</p>
<ul>
<li><a href="/proof/reports/final">Final external-review report</a></li>
<li>${sourcePathCell(data.persistentEvidence.finalReportPath)}</li>
<li>${sourcePathCell("docs/architecture/proof-cockpit-machine-qa-evidence-model.json")}</li>
</ul>
${nonClaimsBlock()}`,
  );
}

function renderFinalReport(data, state) {
  const sections = finalReportSections(data, state);
  return layout(
    "Final external-review report",
    `<p>This report is externally reviewable and print/export friendly. It answers what was proven, why, when, where, how, who or what performed the proof, which resources and semantic definitions were used, which services/routes/ports/adapters/providers/commands/screenshots/artifacts support it, which items require human review, and what remains unclaimed.</p>
<table><tbody>
<tr><th>Repository report path</th><td>${sourcePathCell(data.persistentEvidence.finalReportPath)}</td></tr>
<tr><th>External-review bundle path</th><td>${sourcePathCell("evidence/proof-evidence/proof-cockpit/external-review-bundle/README.md")}</td></tr>
<tr><th>Persistent evidence store</th><td>${sourcePathCell(data.persistentEvidence.path)}</td></tr>
</tbody></table>
${sections
      .map(
        ([title, body], index) => `<section><h2>${index + 1}. ${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`,
      )
      .join("")}
${nonClaimsBlock()}`,
  );
}

function renderActions(state) {
  return layout(
    "Proof QA actions",
    `<p>This ledger stores browser-entered QA actions for review. It is local operational evidence capture only, not immutable final acceptance.</p>
<section>
<h2>Record general QA action</h2>
${actionForm({ actionType: "blocker-record", actionName: "general QA observation", returnTo: "/proof/actions" })}
</section>
<section>
<h2>Recent actions</h2>
${table(["Action", "Created", "Type", "Target", "Role", "Outcome", "Actor"], recentActionRows(state, 100))}
</section>
${nonClaimsBlock()}`,
  );
}

function renderAction(state, actionId) {
  const action = state.actions.find((candidate) => candidate.id === actionId);
  if (!action) {
    return notFound(`QA action ${actionId} was not found.`);
  }
  return layout(
    `QA action ${action.id}`,
    `<p><a href="/proof/actions">Back to QA actions</a></p>
<table><tbody>${actionDetailRows(action).join("")}</tbody></table>
<section>
<h2>Review controls</h2>
<p><label><input type="checkbox" disabled> This action is reviewed by an authorised human auditor.</label></p>
<p><label><input type="checkbox" disabled> This action is promoted into immutable final evidence.</label></p>
<p><label><input type="checkbox" disabled> This action contributes to final USF-290 acceptance.</label></p>
<p>These controls remain disabled until Matthew records final human acceptance.</p>
</section>
${nonClaimsBlock()}`,
  );
}

function machineRunRows(state) {
  const machineActions = state.actions.filter((action) =>
    [
      "machine-run-viewed",
      "machine-evidence-accepted",
      "machine-evidence-rejected",
      "retest-requested",
      "residual-risk-accepted",
      "corrective-action-created",
      "report-exported",
    ].includes(action.actionType),
  );
  if (!machineActions.length) {
    return [
      `<tr><td>latest-machine-qa</td><td>not-imported</td><td>Use corepack pnpm proof-cockpit:machine-qa, then review the generated bundle.</td><td><a href="/proof/import/latest-machine-qa">import</a></td></tr>`,
    ];
  }
  return machineActions.slice(0, 25).map((action) => `<tr>
<td><a href="/proof/machine-runs/${escapeHtml(action.id)}">${escapeHtml(action.id)}</a></td>
<td>${escapeHtml(action.createdAt)}</td>
<td>${escapeHtml(action.actionType)}</td>
<td>${escapeHtml(action.outcome)}</td>
</tr>`);
}

function renderMachineRuns(state) {
  return layout(
    "Machine QA runs",
    `<p>Machine QA runs are importable evidence packages. A run can pre-fill evidence and gaps, but it cannot complete Matthew's final acceptance automatically.</p>
<section>
<h2>Expected generated manifests</h2>
${unorderedList([
      "qa-run.json",
      "evidence-index.json",
      "screenshot-manifest.json",
      "command-manifest.json",
      "service-manifest.json",
      "adapter-manifest.json",
      "route-manifest.json",
      "control-map.json",
      "gap-register.json",
      "human-import-manifest.json",
      "chain-of-custody.json",
    ])}
</section>
<section>
<h2>Runs and import actions</h2>
${table(["Run or action", "Created", "State", "Import/review"], machineRunRows(state))}
</section>
<section>
<h2>Record machine run review</h2>
${actionForm({
      actionType: "machine-run-viewed",
      actionName: "machine QA run viewed",
      sourceUrl: "docs/architecture/proof-cockpit-machine-qa-evidence-model.json",
      returnTo: "/proof/machine-runs",
    })}
</section>
${nonClaimsBlock()}`,
  );
}

function renderMachineRun(state, runId) {
  const action = state.actions.find((candidate) => candidate.id === runId);
  const importedState = action ? "ledger-action-found" : "generated-run-review-record";
  return layout(
    `Machine QA run ${runId}`,
    `<p><a href="/proof/machine-runs">Back to machine runs</a></p>
<table><tbody>
<tr><th>Run id</th><td>${escapeHtml(runId)}</td></tr>
<tr><th>Import state</th><td>${escapeHtml(importedState)}</td></tr>
<tr><th>Schema version</th><td>proof-cockpit-machine-qa-evidence-v1</td></tr>
<tr><th>Human acceptance</th><td>not automatic; Matthew decision required per capability or residual risk</td></tr>
<tr><th>Evidence model</th><td>${sourcePathCell("docs/architecture/proof-cockpit-machine-qa-evidence-model.json")}</td></tr>
</tbody></table>
<section>
<h2>Chain of custody fields</h2>
${unorderedList([
      "claim text",
      "semantic source",
      "test or scenario used",
      "actor/tool and role/persona",
      "service, route, API, port, or adapter",
      "artifact path and hash",
      "timestamp, environment, source SHA, deployment SHA",
      "validation result",
      "human import or acceptance status",
      "known limitations",
    ])}
</section>
<section>
<h2>Import this run</h2>
<p><a href="/proof/import/${escapeHtml(runId)}">Open import workflow for ${escapeHtml(runId)}</a></p>
</section>
${nonClaimsBlock()}`,
  );
}

function renderImportIndex(state) {
  return layout(
    "Machine evidence import",
    `<p>Use this page to import a machine QA bundle into the human review workflow. Import records are audited separately from machine results.</p>
<section>
<h2>Import workflow</h2>
${orderedList([
      "Load the latest machine QA run and inspect summary counts.",
      "Compare gaps and evidence with the previous accepted run where available.",
      "Review per-capability evidence, screenshots, service evidence, and chain-of-custody rows.",
      "Accept, reject, annotate, defer, accept residual risk, or request re-test.",
      "Export a human-reviewed report only after the decisions are recorded.",
    ])}
</section>
<section>
<h2>Available run review target</h2>
<p><a href="/proof/import/latest-machine-qa">Import latest-machine-qa</a></p>
</section>
<section>
<h2>Recent import decisions</h2>
${table(["Action", "Created", "Type", "Target", "Role", "Outcome", "Actor"], recentActionRows(state, 20))}
</section>
${nonClaimsBlock()}`,
  );
}

function renderImportRun(data, runId) {
  const rows = data.capabilities.slice(0, 75).map((capability) => `<tr>
<td><a href="/proof/import/${escapeHtml(runId)}/capabilities/${escapeHtml(capability.id)}">${escapeHtml(capability.id)}</a></td>
<td>${escapeHtml(capability.name)}</td>
<td>${escapeHtml(capability.domain)}</td>
<td>human-review-required</td>
<td>${capability.serviceRefs.length}</td>
<td>${capability.scenarioIds.length}</td>
</tr>`);
  return layout(
    `Import run ${runId}`,
    `<p><a href="/proof/import">Back to import index</a></p>
<p>This run import view is a human decision surface. Machine evidence may be accepted only after capability-specific review.</p>
<section>
<h2>Capability import review</h2>
${table(["Capability", "Name", "Domain", "Human import state", "Services", "Scenarios"], rows)}
</section>
<section>
<h2>Bulk acceptance boundary</h2>
<p><label><input type="checkbox" disabled> Bulk acceptance available only when all machine checks pass and no human decision, gap, stale evidence, or residual risk remains.</label></p>
</section>
${nonClaimsBlock()}`,
  );
}

function renderImportCapability(data, runId, capabilityId) {
  const capability = data.capabilities.find((candidate) => candidate.id === capabilityId);
  if (!capability) {
    return notFound(`Capability ${capabilityId} was not found for import.`);
  }
  const serviceRows = capability.serviceRefs.length
    ? capability.serviceRefs.map((service) => `<tr>
<td>${serviceLink(service)}</td>
<td>serviceEvidence</td>
<td>human-review-required</td>
<td>machine screenshot or API evidence required before acceptance</td>
</tr>`)
    : [`<tr><td colspan="4">No mapped service evidence. This is a human-review gap.</td></tr>`];
  return layout(
    `Import ${capability.name}`,
    `<p><a href="/proof/import/${escapeHtml(runId)}">Back to run import</a></p>
<table><tbody>
<tr><th>Run id</th><td>${escapeHtml(runId)}</td></tr>
<tr><th>Capability id</th><td>${escapeHtml(capability.id)}</td></tr>
<tr><th>Domain</th><td>${escapeHtml(capability.domain)}</td></tr>
<tr><th>Semantic target</th><td>${escapeHtml(capability.semanticTarget)}</td></tr>
<tr><th>Human import status</th><td>human-review-required</td></tr>
</tbody></table>
<section>
<h2>Evidence decision table</h2>
${table(["Target", "Evidence type", "Machine state", "Human decision needed"], [
      `<tr><td>${escapeHtml(capability.id)}</td><td>capabilityEvidence</td><td>machine-generated or human-review-required</td><td>accept, reject, annotate, defer, or request re-test</td></tr>`,
      `<tr><td>${escapeHtml(capability.scenarioIds[0])}</td><td>scenarioEvidence</td><td>machine-generated or human-review-required</td><td>verify steps, role, tenant, audit, observability, alert, fixture, screenshot</td></tr>`,
      `<tr><td>${escapeHtml(capability.scenarioIds[1])}</td><td>negativeProof</td><td>machine-generated or human-review-required</td><td>verify denial or failure path evidence</td></tr>`,
      ...serviceRows,
    ])}
</section>
<section>
<h2>Record human import decision</h2>
${actionForm({
      actionType: "machine-evidence-accepted",
      capabilityId: capability.id,
      actionName: `review machine evidence for ${capability.name}`,
      sourceUrl: "docs/architecture/proof-cockpit-machine-qa-evidence-model.json",
      evidenceUrl: `/proof/import/${runId}/capabilities/${capability.id}`,
      returnTo: `/proof/import/${runId}/capabilities/${capability.id}`,
    })}
</section>
${nonClaimsBlock()}`,
  );
}

function reviewRows(kind) {
  const rows = {
    gaps: [
      ["missing-compose-service-screenshot", "Service console screenshot or API evidence is not captured.", "service owner", "run service adapter or record authorised manual evidence"],
      ["human-decision-required", "Machine evidence cannot make final acceptance.", "Matthew", "accept, reject, annotate, defer, or request re-test"],
      ["service-auth-unavailable", "Service requires SSO or authorised staging-safe service login.", "platform operator", "provide safe account or mark gap blocking acceptance"],
    ],
    nonconformities: [
      ["machine-evidence-incomplete", "Evidence chain cannot support the claim.", "auditor", "create corrective action"],
      ["stale-evidence", "Evidence captured after reviewAfter date or against old SHA.", "auditor", "request re-test"],
    ],
    correctiveActions: [
      ["service-adapter-needed", "Implement or configure missing service adapter.", "platform operator", "re-run proof-cockpit:machine-qa"],
      ["capability-evidence-needed", "Perform missing human QA action for capability.", "capability owner", "record action and attach evidence"],
    ],
  }[kind];
  return rows.map(([id, description, owner, nextAction]) => `<tr>
<td>${escapeHtml(id)}</td>
<td>${escapeHtml(description)}</td>
<td>${escapeHtml(owner)}</td>
<td>${escapeHtml(nextAction)}</td>
</tr>`);
}

function renderReview(kind = "index") {
  if (kind === "gaps") {
    return layout("Machine QA gap register", `${table(["Gap", "Description", "Owner", "Next action"], reviewRows("gaps"))}${nonClaimsBlock()}`);
  }
  if (kind === "nonconformities") {
    return layout("Nonconformities", `${table(["Nonconformity", "Description", "Owner", "Next action"], reviewRows("nonconformities"))}${nonClaimsBlock()}`);
  }
  if (kind === "corrective-actions") {
    return layout("Corrective actions", `${table(["Corrective action", "Description", "Owner", "Re-test"], reviewRows("correctiveActions"))}${nonClaimsBlock()}`);
  }
  return layout(
    "Machine QA review",
    `<p>Review machine evidence, gaps, nonconformities, corrective actions, stale evidence, and residual-risk decisions here.</p>
<ul>
<li><a href="/proof/review/gaps">Gap register</a></li>
<li><a href="/proof/review/nonconformities">Nonconformities</a></li>
<li><a href="/proof/review/corrective-actions">Corrective actions</a></li>
<li><a href="/proof/export">External-review export</a></li>
</ul>
${nonClaimsBlock()}`,
  );
}

function renderReviewDetail(state, reviewId) {
  const action = state.actions.find((candidate) => candidate.id === reviewId);
  if (action) {
    return renderAction(state, reviewId);
  }
  return layout(
    `Review ${reviewId}`,
    `<p><a href="/proof/review">Back to review hub</a></p>
<p>No persisted human review action currently has this id. The route is intentionally present so imported machine evidence, retest requests, residual-risk acceptances, and corrective actions can link to stable human-review detail pages once recorded.</p>
<table><tbody>
<tr><th>Review id</th><td>${escapeHtml(reviewId)}</td></tr>
<tr><th>Status</th><td>human-review-required</td></tr>
<tr><th>Persistence path</th><td>${sourcePathCell("evidence/proof-evidence/proof-cockpit/human-review-actions.json")}</td></tr>
<tr><th>Final signoff</th><td>not auto-completed</td></tr>
</tbody></table>
${nonClaimsBlock()}`,
  );
}

function renderExport() {
  return layout(
    "External-review export",
    `<p>The machine QA command produces a portable evidence bundle for external reviewers. Exporting from the browser records a human action but does not make final acceptance automatic.</p>
<section>
<h2>Bundle layout</h2>
${unorderedList([
      "README.md",
      "executive-summary.md",
      "detailed-report.md",
      "qa-run.json",
      "evidence-index.json",
      "chain-of-custody.json",
      "screenshots/",
      "page-html/",
      "network/",
      "console/",
      "commands/",
      "service-evidence/",
      "source-documents/",
      "gap-register.md",
      "corrective-actions.md",
      "non-claims.md",
      "human-import-summary.md",
    ])}
</section>
<section>
<h2>Record export review</h2>
${actionForm({
      actionType: "report-exported",
      actionName: "external-review evidence bundle exported",
      sourceUrl: "docs/architecture/proof-cockpit-machine-qa-evidence-model.json",
      returnTo: "/proof/export",
    })}
</section>
${nonClaimsBlock()}`,
  );
}

function foundationClosureSummaryRows(summary = {}) {
  return Object.entries(summary).map(
    ([key, value]) => `<tr><td>${escapeHtml(titleCase(key))}</td><td>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</td></tr>`,
  );
}

function foundationClosureSourceRows(evidenceSources = []) {
  return evidenceSources.map(
    (source) =>
      `<tr><td>${escapeHtml(source.title ?? source.id)}</td><td>${sourcePathCell(source.path)}</td><td>${escapeHtml(source.id ?? "")}</td></tr>`,
  );
}

function foundationClosureChainRows(evidence = {}) {
  const report = evidence.report ?? {};
  const provenance = evidence.provenance ?? {};
  return [
    ["current-state-record", "USF-292", "foundation closure validator", FOUNDATION_CLOSURE_RECORD_SOURCE, report.id ?? "missing", report.closureState ?? "missing"],
    ["dev-foundation", "USF-292", "Dev closure artefact", "docs/architecture/dev-foundation-substrate-closure.json", "current Dev substrate", "complete"],
    ["dev-compose", "USF-292", "Dev compose artefact", "docs/architecture/dev-compose-substrate-closure.json", "current service catalogue", "complete"],
    ["dev-command-proof", "USF-292", "Dev command artefact", "docs/architecture/dev-command-proof-closure.json", "current proof commands", "complete"],
    ["dev-to-test-handoff", "USF-292", "Dev-to-Test artefact", "docs/architecture/dev-to-test-closure-handoff.json", "handoff boundary", "complete"],
    ["sealed-provenance", provenance.completedIssue ?? "sealed", "PR 243 merge", FOUNDATION_CLOSURE_PROVENANCE_SOURCE, provenance.completedPullRequest?.mergeSha ?? "", "provenance-only"],
  ].map(
    ([chainId, claimId, method, artifactPath, artifactHash, status]) => `<tr>
<td>${escapeHtml(chainId)}</td>
<td>${escapeHtml(claimId)}</td>
<td>${escapeHtml(method)}</td>
<td>${sourcePathCell(artifactPath)}</td>
<td>${escapeHtml(artifactHash)}</td>
<td>${escapeHtml(status)}</td>
</tr>`,
  );
}

function renderFoundationSubstrateClosure(data, state) {
  const evidence = data.foundationClosure ?? loadFoundationClosureEvidence();
  const importRecord = evidence.importRecord ?? {};
  const report = evidence.report ?? {};
  const provenance = evidence.provenance ?? {};
  const importedValidator = importRecord.validatorEvidence ?? {};
  const liveValidator = runFoundationClosureValidatorCheck();
  const recordedActions = recordedActionCountFor(
    state,
    (action) =>
      action.sourceUrl === FOUNDATION_CLOSURE_IMPORT_SOURCE ||
      action.evidenceId === "usf-foundation-substrate-closure" ||
      action.actionName?.includes("Foundation substrate closure"),
  );
  return layout(
    "USF foundation substrate closure evidence",
    `<p>This page imports current-state USF foundation substrate closure evidence into the USF-290 staging proof cockpit so the auditor can verify Dev and Test closure before staging capability QA. It does not complete USF-290 and it does not claim product UI readiness.</p>
<table><tbody>
<tr><th>Current-state issue</th><td>${escapeHtml(importRecord.currentStateIssue ?? "USF-292")}</td></tr>
<tr><th>Sealed source completion issue</th><td>${escapeHtml(importRecord.sourceCompletionIssue ?? provenance.completedIssue ?? "recorded in sealed provenance")}</td></tr>
<tr><th>Source completion PR</th><td><a href="${escapeHtml(importRecord.sourcePullRequest?.url ?? "https://github.com/maldous/usf/pull/243")}">PR ${escapeHtml(importRecord.sourcePullRequest?.number ?? "243")}</a></td></tr>
<tr><th>Merge SHA</th><td>${escapeHtml(importRecord.sourcePullRequest?.mergeSha ?? "ec37409ddd779661569f8e5f8e4c835695efea96")}</td></tr>
<tr><th>Bounded claim imported for review</th><td>${escapeHtml(importRecord.boundedClaimImportedForReview ?? report.currentStateClaim ?? "missing")}</td></tr>
<tr><th>Closure state</th><td>${escapeHtml(report.closureState ?? "missing")}</td></tr>
<tr><th>Open gap count</th><td>${escapeHtml(evidence.importedSummary?.openGapCount ?? report.gaps?.length ?? "missing")}</td></tr>
<tr><th>Recorded QA reviews</th><td>${recordedActions}</td></tr>
</tbody></table>
<section>
<h2>Validator result</h2>
<table><tbody>
<tr><th>Validator command</th><td>${escapeHtml(importedValidator.allCommand ?? FOUNDATION_CLOSURE_VALIDATOR_COMMAND.join(" "))}</td></tr>
<tr><th>Validator result</th><td>${escapeHtml(importedValidator.allResult ?? "missing")}</td></tr>
<tr><th>Selftest command</th><td>${escapeHtml(importedValidator.selftestCommand ?? "missing")}</td></tr>
<tr><th>Selftest result</th><td>${escapeHtml(importedValidator.selftestResult ?? "missing")}</td></tr>
<tr><th>Local live-check status</th><td>${escapeHtml(liveValidator.status)}</td></tr>
<tr><th>Local live-check command</th><td>${escapeHtml(liveValidator.command)}</td></tr>
</tbody></table>
<p>${escapeHtml(importedValidator.liveCheckNote ?? "Local live checks are diagnostic only for this cockpit page.")}</p>
<pre>${escapeHtml(liveValidator.detail)}</pre>
</section>
<section>
<h2>Evidence summary</h2>
${table(["Metric", "Value"], foundationClosureSummaryRows(evidence.importedSummary))}
</section>
<section>
<h2>Current-state source evidence</h2>
${table(["Evidence", "Read-only source link", "Evidence id"], foundationClosureSourceRows(evidence.evidenceSources))}
</section>
<section>
<h2>Chain of custody</h2>
${table(["Chain id", "Claim id", "Method", "Artifact", "Evidence value", "Status"], foundationClosureChainRows(evidence))}
</section>
<section>
<h2>Record Foundation substrate closure evidence review</h2>
${actionForm({
      actionType: "evidence-review",
      evidenceId: "usf-foundation-substrate-closure",
      sourceUrl: FOUNDATION_CLOSURE_IMPORT_SOURCE,
      evidenceUrl: "/proof/foundation-substrate-closure",
      actionName: "review USF foundation substrate closure evidence",
      returnTo: "/proof/foundation-substrate-closure",
    })}
</section>
${nonClaimsBlock()}
<section>
<h2>Preserved non-claims</h2>
${unorderedList(evidence.nonClaims)}
</section>`,
  );
}

function routeToLink(route) {
  if (route.includes(":runId") && route.includes(":capabilityId")) {
    return `${escapeHtml(route)} - dynamic capability import detail from <a href="/proof/import/latest-machine-qa">machine import</a>`;
  }
  if (route.includes(":runId")) {
    return `${escapeHtml(route)} - dynamic machine run detail from <a href="/proof/machine-runs">machine runs</a>`;
  }
  if (route.includes(":capabilityId")) {
    return `${escapeHtml(route)} - dynamic detail from <a href="/proof/capabilities">capability list</a>`;
  }
  if (route.includes(":scenarioId")) {
    return `${escapeHtml(route)} - dynamic scenario detail from capability pages`;
  }
  if (route.includes(":evidenceId")) {
    return `${escapeHtml(route)} - dynamic evidence detail from capability pages`;
  }
  if (route.includes(":serviceId")) {
    return `${escapeHtml(route)} - dynamic service detail from <a href="/proof/services">service inventory</a>`;
  }
  return `<a href="${escapeHtml(route)}">${escapeHtml(route)}</a>`;
}

function renderQa(data, state) {
  const artifactRows = [
    ["Capability evidence", "semantic contract, route/API proof, role/persona, happy path, negative path, screenshot", "/proof/capabilities"],
    ["Foundation substrate closure evidence", "current-state report, Dev closure artefacts, sealed provenance, validator result, and merge SHA", "/proof/foundation-substrate-closure"],
    ["Service evidence", "compose profile, health/readiness, seed/reset/cleanup, safe operation, proof command", "/proof/services"],
    ["Audit evidence", "actor, tenant, action, result, timestamp, correlation id, immutable link", "/proof/audit"],
    ["Observability evidence", "trace id, log line, metric/latency bucket, dashboard or runbook link", "/proof/observability"],
    ["Fixture evidence", "synthetic dataset, last reset, cleanup, residual state, no real tenant data", "/proof/fixtures"],
    ["Alert evidence", "alert name, trigger condition, route/service, expected severity, evidence link", "/proof/alerts"],
    ["Enterprise evidence", "ISMS-supporting control page, owner, evidence source, exception/risk decision", "/proof/enterprise"],
    ["Result evidence", "final decision remains disabled until final proofing is implemented", "/proof/result"],
  ].map(
    ([name, required, href]) =>
      `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(required)}</td><td><a href="${escapeHtml(href)}">${escapeHtml(href)}</a></td></tr>`,
  );
  return layout(
    "Proof QA workflow",
    `<p>This page is the acceptance-grade human confirmation workflow for staging proof preparation. It describes what the auditor must do; it does not mark anything accepted.</p>
${warningsBlock()}
<section>
<h2>Human confirmation sequence</h2>
${orderedList(HUMAN_QA_STEPS)}
</section>
<section>
<h2>Proof ladder prerequisite check</h2>
<p>Staging QA is only meaningful after the auditor has confirmed the dev and test evidence layers that the staging exercise builds on. This page exposes those prerequisite references but does not re-close or re-claim them.</p>
${table(
      ["Layer", "Evidence source", "Auditor action", "State"],
      PROOF_LADDER_LEVELS.map(
        ([layer, source, action, state]) =>
          `<tr><td>${escapeHtml(layer)}</td><td>${escapeHtml(source)}</td><td>${escapeHtml(action)}</td><td>${escapeHtml(state)}</td></tr>`,
      ),
    )}
</section>
<section>
<h2>Machine proof to human work map</h2>
<p>Machine-completed proof is not enough for staging QA signoff by itself. The auditor must connect each proof area to the human verification work below.</p>
${table(["Proof area", "Issue", "Evidence source", "Human auditor work required"], machineProofWorkRows())}
</section>
<section>
<h2>Required evidence bundle per accepted capability</h2>
${table(["Evidence area", "Required content", "Cockpit route"], artifactRows)}
</section>
<section>
<h2>Minimal browser UI required for complete staging proof</h2>
${table(["Proof area", "Required input or check", "Route", "Current state"], stagingProofUiRows())}
</section>
<section>
<h2>Stop conditions</h2>
${unorderedList(STOP_CONDITIONS)}
</section>
<section>
<h2>Record QA action</h2>
${actionForm({ actionType: "capability-qa", actionName: "staging QA observation", returnTo: "/proof/actions" })}
</section>
<section>
<h2>Recent QA actions</h2>
${table(["Action", "Created", "Type", "Target", "Role", "Outcome", "Actor"], recentActionRows(state, 20))}
</section>
<section>
<h2>Current acceptance-grade scope</h2>
<p>${data.capabilities.length} capability rows and ${data.services.length} service catalogue rows are visible for review. Runtime evidence remains explicitly missing unless a row links to existing repository evidence.</p>
</section>
${nonClaimsBlock()}`,
  );
}

function renderCapabilities(data) {
  const rows = data.capabilities.map((capability) => {
    return `<tr>
<td><a href="/proof/capabilities/${escapeHtml(capability.id)}">${escapeHtml(capability.name)}</a></td>
<td>${escapeHtml(capability.domain)}</td>
<td>${escapeHtml(capability.semanticTarget)}</td>
<td>${escapeHtml(capability.firstPassState)}</td>
<td>${capability.scenarioIds.length}</td>
<td>${capability.evidenceIds.length + capability.proofTokens.length}</td>
<td>${escapeHtml(capability.signoffState)}</td>
</tr>`;
  });
  const grouped = [...new Set(data.capabilities.map((capability) => capability.domain))]
    .sort()
    .map((domain) => `<li>${escapeHtml(domain)}: ${data.capabilities.filter((capability) => capability.domain === domain).length}</li>`)
    .join("");
  return layout(
    "Proof capabilities",
    `<p>Capability rows are parsed from docs/architecture/capability-source-coverage-matrix.md. Portfolio states are not acceptance states.</p>
<section><h2>Domain grouping</h2><ul>${grouped}</ul></section>
${table(["Capability", "Domain", "Semantic target", "Portfolio state", "Scenario count", "Evidence count", "Signoff state"], rows)}`,
  );
}

function renderServices(data) {
  const rows = data.services.map((service) => {
    const integration = service.integration ?? {};
    return `<tr>
<td>${serviceLink(service)}</td>
<td>${escapeHtml(service.serviceOwner ?? "missing")}</td>
<td>${escapeHtml(service.assetInventoryClass ?? "missing")}</td>
<td>${escapeHtml((service.profileNames ?? []).join(", ") || "missing")}</td>
<td>${escapeHtml(integration.integrationDisposition ?? service.environmentDisposition ?? "missing")}</td>
<td>${escapeHtml(integration.proofCommand ?? "human-review-required")}</td>
<td>${escapeHtml(service.firstPassClickThroughState)}</td>
</tr>`;
  });
  const profileRows = data.profileRows.map(
    (profile) => `<tr>
<td>${escapeHtml(profile.profile)}</td>
<td>${escapeHtml(profile.composeTarget)}</td>
<td>${escapeHtml(profile.serviceCount)}</td>
<td>${escapeHtml(profile.mustStart)}</td>
<td>${escapeHtml(profile.mustSeed)}</td>
<td>${escapeHtml(profile.mustExercise)}</td>
<td>${escapeHtml(profile.mustTeardown)}</td>
</tr>`,
  );
  return layout(
    "Proof services",
    `<p>Service rows come from the repository service catalogue and composed integration matrix. These links are the final click-through surface for service-backed proof validation.</p>
<section>
<h2>Service inventory</h2>
${table(["Service", "Owner", "Asset class", "Profiles", "Integration disposition", "Proof command", "Click-through state"], rows)}
</section>
<section>
<h2>Compose profile exercise requirements</h2>
${table(["Profile", "Target", "Service count", "Must start", "Must seed", "Must exercise", "Must teardown"], profileRows)}
</section>`,
  );
}

function safeSourcePath(path) {
  const value = String(path ?? "");
  const baseValue = value.split("#")[0];
  if (!baseValue || baseValue.startsWith("/") || baseValue.includes("..") || /(^|\/)\./.test(baseValue)) {
    return "";
  }
  if (/secret|token|credential|private|\.pem|\.key|\.env/i.test(baseValue)) {
    return "";
  }
  return SOURCE_PATH_PREFIXES.some((prefix) => baseValue.startsWith(prefix)) ? baseValue : "";
}

function sourceLink(path, label = path) {
  return `<a href="/proof/source?path=${encodeURIComponent(path)}">${escapeHtml(label)}</a>`;
}

function sourcePathCell(path) {
  const safePath = safeSourcePath(path);
  return safePath ? sourceLink(safePath, path) : escapeHtml(path);
}

function renderSources() {
  const rows = SOURCE_DOCUMENTS.map(
    ([title, path]) =>
      `<tr><td>${escapeHtml(title)}</td><td>${sourceLink(path)}</td><td>repository evidence source</td></tr>`,
  );
  return layout(
    "Proof source documents",
    `<p>This index exposes whitelisted repository evidence and source documents in the browser for human QA review. It intentionally does not expose secrets, environment files, private keys, or arbitrary filesystem paths.</p>
${table(["Document", "Path", "Purpose"], rows)}
<section>
<h2>Record source-document review</h2>
${actionForm({ actionType: "source-document-review", actionName: "source document review", returnTo: "/proof/actions" })}
</section>`,
  );
}

function renderSourceFile(url) {
  const path = safeSourcePath(url?.searchParams?.get("path"));
  if (!path) {
    return notFound("Source path is not whitelisted for browser review.");
  }
  const content = readTextOrNull(join(ROOT, path));
  if (content === null) {
    return notFound(`Source document ${path} was not found.`);
  }
  return layout(
    `Source ${path}`,
    `<p><a href="/proof/sources">Back to source documents</a></p>
<table><tbody>
<tr><th>Path</th><td>${escapeHtml(path)}</td></tr>
<tr><th>Source SHA</th><td>${escapeHtml(getSourceSha())}</td></tr>
<tr><th>Authority note</th><td>Rendered read-only for QA review. Generated reports remain lower authority than source evidence, validators, and repository artefacts.</td></tr>
</tbody></table>
<section>
<h2>Record review of this source</h2>
${actionForm({ actionType: "source-document-review", sourceUrl: path, actionName: `review ${path}`, returnTo: "/proof/actions" })}
</section>
<section>
<h2>Content</h2>
<pre>${escapeHtml(content.slice(0, 200000))}</pre>
</section>`,
  );
}

function renderService(data, state, serviceId) {
  const service = data.servicesById.get(serviceId);
  if (!service) {
    return notFound(`Service ${serviceId} was not found.`);
  }
  const integration = service.integration ?? {};
  const lifecycle = integration.lifecycleApi ?? {};
  const evidenceTests = integration.evidenceTests ?? [];
  const recordedActions = recordedActionCountFor(state, (action) => action.serviceId === service.serviceId);
  const qaRows = [
    ["Health/readiness", "Open authorised service health or readiness surface; record status and timestamp.", "human-review-required"],
    ["Fixture seed", `Confirm seeder ${lifecycle.seederId ?? "missing"} and fixture ${integration.fixtureSeedId ?? "missing"}.`, "human-review-required"],
    ["Safe operation", integration.safeOperationEvidence ?? "Perform one non-destructive operation and record result.", "human-review-required"],
    ["Negative/degraded path", "Exercise unavailable, denied, invalid, or timeout path where the service contract requires it.", "human-review-required"],
    ["Audit", service.auditRequirement ?? service.auditPosture ?? "Record audit event evidence.", "human-review-required"],
    ["Observability", "Capture log, metric, trace, and dashboard/runbook link.", "human-review-required"],
    ["Reset/cleanup", `Confirm resetter ${lifecycle.resetterId ?? "missing"} and cleanup ${lifecycle.cleanupId ?? "missing"}.`, "human-review-required"],
    ["Teardown", `Confirm teardown ${lifecycle.teardownId ?? "missing"}.`, "human-review-required"],
  ].map(
    ([area, action, status]) =>
      `<tr><td>${escapeHtml(area)}</td><td>${escapeHtml(action)}</td><td>${escapeHtml(status)}</td></tr>`,
  );
  return layout(
    service.displayName ?? service.serviceId,
    `<p><a href="/proof/services">Back to services</a></p>
<table><tbody>
<tr><th>Service id</th><td>${escapeHtml(service.serviceId)}</td></tr>
<tr><th>Purpose</th><td>${escapeHtml(service.purpose ?? "missing")}</td></tr>
<tr><th>Service owner</th><td>${escapeHtml(service.serviceOwner ?? "missing")}</td></tr>
<tr><th>Risk owner</th><td>${escapeHtml(service.riskOwner ?? "missing")}</td></tr>
<tr><th>Control owner</th><td>${escapeHtml(service.controlOwner ?? "missing")}</td></tr>
<tr><th>Provider boundary</th><td>${escapeHtml(service.providerBoundary ?? "missing")}</td></tr>
<tr><th>Data classification</th><td>${escapeHtml(service.dataClassification ?? "missing")}</td></tr>
<tr><th>Tenant boundary</th><td>${escapeHtml(service.tenantBoundary ?? "missing")}</td></tr>
<tr><th>Access posture</th><td>${escapeHtml(service.accessPosture ?? "missing")}</td></tr>
<tr><th>Auth requirement</th><td>${escapeHtml(service.authRequirement ?? "missing")}</td></tr>
<tr><th>Audit posture</th><td>${escapeHtml(service.auditPosture ?? "missing")}</td></tr>
<tr><th>Secret posture</th><td>${escapeHtml(service.secretPosture ?? "missing")}</td></tr>
<tr><th>Backup/restore posture</th><td>${escapeHtml(service.backupRestorePosture ?? "missing")}</td></tr>
<tr><th>Retention posture</th><td>${escapeHtml(service.retentionPosture ?? "missing")}</td></tr>
<tr><th>Compose profiles</th><td>${escapeHtml((service.profileNames ?? []).join(", ") || "missing")}</td></tr>
<tr><th>Proof command</th><td>${escapeHtml(integration.proofCommand ?? "human-review-required")}</td></tr>
<tr><th>Proof script</th><td>${escapeHtml(integration.proofScript ?? "human-review-required")}</td></tr>
<tr><th>Test suite</th><td>${escapeHtml(integration.testSuitePath ?? "human-review-required")}</td></tr>
<tr><th>Runtime click-through URL</th><td>human-review-required; final cockpit must link only to authorised staging service surfaces or runbooks</td></tr>
<tr><th>Recorded QA actions</th><td>${recordedActions}</td></tr>
</tbody></table>
<section>
<h2>Human service click-through checklist</h2>
${table(["Area", "Required human action", "Portfolio status"], qaRows)}
</section>
<section>
<h2>Record service click-through action</h2>
${actionForm({
      actionType: "service-clickthrough",
      serviceId: service.serviceId,
      actionName: `click through ${service.displayName ?? service.serviceId}`,
      sourceUrl: "spec/instances/compose-service/service-catalogue.json",
      returnTo: `/proof/services/${service.serviceId}`,
    })}
</section>
<section>
<h2>Evidence tests</h2>
${unorderedList(evidenceTests.length ? evidenceTests : ["human-review-required"])}
</section>
<section>
<h2>Service stop conditions</h2>
${unorderedList(STOP_CONDITIONS)}
</section>`,
  );
}

function renderCapability(data, state, capabilityId) {
  const capability = data.capabilities.find((candidate) => candidate.id === capabilityId);
  if (!capability) {
    return notFound(`Capability ${capabilityId} was not found.`);
  }
  const surfaceChecklist = [
    "semantic target visible",
    "route/API references visible",
    "required roles visible",
    "required backend services visible",
    "happy path scenario review surface visible",
    "negative path scenario review surface visible",
    "audit evidence mapping visible",
    "logs metrics traces mapping visible",
    "alert evidence mapping visible",
    "screenshot evidence mapping visible",
    "synthetic data/reset mapping visible",
    "manual signoff control visible",
    "immutable artifact mapping visible",
  ];
  const serviceItems = capability.serviceRefs.length
    ? capability.serviceRefs.map((service) => `<li>${serviceSummary(service)}</li>`).join("")
    : capability.serviceNames.map((service) => `<li>${escapeHtml(service)} - needs-runtime-wiring</li>`).join("");
  const qaServiceRows = capability.serviceRefs.length
    ? capability.serviceRefs.map((service) => {
        const integration = service.integration ?? {};
        return `<tr>
<td>${serviceLink(service)}</td>
<td>${escapeHtml((service.profileNames ?? []).join(", ") || "missing")}</td>
<td>${escapeHtml(integration.proofCommand ?? "human-review-required")}</td>
<td>${escapeHtml(integration.fixtureSeedId ?? "human-review-required")}</td>
<td>${escapeHtml(service.firstPassClickThroughState)}</td>
</tr>`;
      })
    : [`<tr><td colspan="5">No repository service catalogue rows mapped in this final cockpit.</td></tr>`];
  const recordedActions = recordedActionCountFor(state, (action) => action.capabilityId === capability.id);
  return layout(
    capability.name,
    `<p><a href="/proof/capabilities">Back to capabilities</a></p>
<table><tbody>
<tr><th>Capability id</th><td>${escapeHtml(capability.id)}</td></tr>
<tr><th>Domain</th><td>${escapeHtml(capability.domain)}</td></tr>
<tr><th>Slice</th><td>${escapeHtml(capability.slice)}</td></tr>
<tr><th>Semantic target</th><td>${escapeHtml(capability.semanticTarget)}</td></tr>
<tr><th>Semantic contract path</th><td>${capability.contract ? sourcePathCell(capability.contract.path) : "human-review-required"}</td></tr>
<tr><th>Portfolio state</th><td>${escapeHtml(capability.firstPassState)}</td></tr>
<tr><th>Recorded QA actions</th><td>${recordedActions}</td></tr>
</tbody></table>
<section><h2>Known route/API references</h2><p>${escapeHtml(capability.evidenceSummary)}</p></section>
<section><h2>Required roles</h2><ul>${capability.roles.map((role) => `<li>${escapeHtml(role)}</li>`).join("")}</ul></section>
<section><h2>Dev to Test to Staging proof ladder</h2>
${table(["Layer", "Evidence source", "Auditor action", "State"], proofLadderRows(capability))}
</section>
<section><h2>Machine proof to human work map</h2>
${table(["Proof area", "Issue", "Evidence source", "Human auditor work required"], machineProofWorkRows())}
</section>
<section><h2>Human QA action plan</h2>${orderedList(HUMAN_QA_STEPS)}</section>
<section><h2>Role-specific QA checklist</h2>
${table(["Role", "Happy path action", "Negative or permission action", "Evidence required", "Portfolio state"], roleChecklistRows(capability))}
</section>
<section><h2>Record capability QA action</h2>
${actionForm({
      actionType: "capability-qa",
      capabilityId: capability.id,
      actionName: `QA ${capability.name}`,
      role: capability.roles[0] ?? "auditor",
      sourceUrl: capability.contract?.path ?? capability.semanticTarget,
      returnTo: `/proof/capabilities/${capability.id}`,
    })}
</section>
<section><h2>Required backend services</h2><ul>${serviceItems}</ul></section>
<section><h2>Compose service click-through requirements</h2>
${table(["Service", "Profiles", "Proof command", "Fixture seed", "State"], qaServiceRows)}
</section>
<section><h2>Scenarios</h2><ul>${capability.scenarioIds
      .map((id) => `<li><a href="/proof/scenarios/${escapeHtml(id)}">${escapeHtml(id)}</a> - human-review-required</li>`)
      .join("")}</ul></section>
<section><h2>Evidence</h2><ul>${capability.evidenceIds
      .map((id) => `<li><a href="/proof/evidence/${escapeHtml(id)}">${escapeHtml(id)}</a></li>`)
      .join("")}</ul></section>
<section><h2>Formal evidence required before acceptance</h2>
${table(["Artifact", "Required content", "Current state"], capabilityQaEvidenceRows(capability))}
</section>
<section><h2>Capability surface inventory</h2><ul>${surfaceChecklist
      .map((item) => `<li><label><input type="checkbox" disabled> ${escapeHtml(item)}</label></li>`)
      .join("")}</ul></section>
<section><h2>Manual signoff</h2><p><label><input type="checkbox" disabled> Matthew final acceptance unavailable in final cockpit</label></p></section>
<p><a href="/proof/enterprise">Enterprise evidence</a></p>`,
  );
}

function renderScenario(data, state, scenarioId) {
  const scenario = data.scenarios.get(scenarioId);
  if (!scenario) {
    return notFound(`Scenario ${scenarioId} was not found.`);
  }
  const capability = data.capabilities.find((candidate) => candidate.id === scenario.capabilityId);
  const scenarioSteps = [
    `Open the capability page for ${capability?.name ?? scenario.capabilityId}.`,
    `Select persona ${scenario.role} and synthetic tenant context.`,
    `Perform the ${scenario.pathType} action using only synthetic data and authorised staging proof surfaces.`,
    "Capture the visible result, HTTP/API response or route state, and screenshot or equivalent artifact.",
    "Record audit event, correlation id, trace id, log/metric evidence, alert evidence, and service state.",
    "Run or record reset and cleanup evidence before any signoff decision.",
  ];
  const recordedActions = recordedActionCountFor(state, (action) => action.scenarioId === scenario.id);
  return layout(
    scenario.name,
    `<p><a href="/proof/capabilities/${escapeHtml(scenario.capabilityId)}">Back to capability</a></p>
<table><tbody>
<tr><th>Status</th><td>human-review-required</td></tr>
<tr><th>Capability</th><td>${escapeHtml(capability?.name ?? scenario.capabilityId)}</td></tr>
<tr><th>Persona</th><td>${escapeHtml(scenario.role)}</td></tr>
<tr><th>Tenant</th><td>synthetic tenant review value</td></tr>
<tr><th>Expected result</th><td>${escapeHtml(scenario.expectedResult)}</td></tr>
<tr><th>Expected audit event</th><td>human-review-required</td></tr>
<tr><th>Expected observability</th><td>missing correlation id, trace id, log, metric, and alert links in final cockpit</td></tr>
<tr><th>Evidence links</th><td>generated evidence mappings only</td></tr>
<tr><th>Recorded QA actions</th><td>${recordedActions}</td></tr>
</tbody></table>
<section><h2>Dev to Test to Staging proof ladder</h2>
${capability ? table(["Layer", "Evidence source", "Auditor action", "State"], proofLadderRows(capability)) : "<p>Capability proof ladder unavailable.</p>"}
</section>
<section><h2>QA steps</h2>${orderedList(scenarioSteps)}</section>
<section><h2>Record scenario exercise</h2>
${actionForm({
      actionType: "scenario-exercise",
      capabilityId: scenario.capabilityId,
      scenarioId: scenario.id,
      role: scenario.role,
      actionName: scenario.name,
      returnTo: `/proof/scenarios/${scenario.id}`,
    })}
</section>
<section><h2>Evidence capture fields</h2>
${table(
      ["Field", "Required value", "Portfolio state"],
      [
        ["Actor and role", scenario.role, "human-review-required"],
        ["Tenant", "synthetic tenant id", "human-review-required"],
        ["Correlation id", "proof run correlation id", "human-review-required"],
        ["Trace id", "distributed trace id or equivalent", "human-review-required"],
        ["Audit event", "event id and immutable link", "human-review-required"],
        ["Service state", "linked service proof state", "human-review-required"],
        ["Screenshot/artifact", "immutable artifact link", "human-review-required"],
      ].map(
        ([field, required, state]) =>
          `<tr><td>${escapeHtml(field)}</td><td>${escapeHtml(required)}</td><td>${escapeHtml(state)}</td></tr>`,
      ),
    )}
</section>`,
  );
}

function renderRoles(data) {
  const rows = ROLES.map((role) => {
    const requiringRole = data.capabilities.filter((capability) => capability.roles.includes(role)).length;
    return `<tr>
<td>${escapeHtml(role)}</td>
<td>${requiringRole}</td>
<td>human-review-required</td>
<td>role-switch control not implemented; final proof must use authorised role login or safe role boundary</td>
<td>audit record must record actor role, tenant, action, result, and correlation id before final proof</td>
</tr>`;
  });
  return layout(
    "Proof roles",
    `${warningsBlock()}${table(["Role", "Capabilities requiring role", "Synthetic persona state", "Role-switch proof", "Audit"], rows)}`,
  );
}

function renderEvidence(data, state, evidenceId) {
  const record = data.evidence.get(evidenceId);
  if (!record) {
    return notFound(`Evidence record ${evidenceId} was not found.`);
  }
  const backHref = record.capabilityId?.startsWith("cap-") ? `/proof/capabilities/${record.capabilityId}` : (record.proofRoute ?? "/proof");
  const backLabel = record.capabilityId?.startsWith("cap-") ? "Back to capability" : "Back to aggregate evidence";
  const recordedActions = recordedActionCountFor(state, (action) => action.evidenceId === record.id);
  return layout(
    record.title,
    `<p><a href="${escapeHtml(backHref)}">${escapeHtml(backLabel)}</a></p>
<table><tbody>
<tr><th>Evidence id</th><td>${escapeHtml(record.id)}</td></tr>
<tr><th>Status</th><td>${escapeHtml(record.status)}</td></tr>
<tr><th>Capability or aggregate target</th><td>${escapeHtml(record.capabilityId)}</td></tr>
<tr><th>Semantic contract</th><td>${sourcePathCell(record.target)}</td></tr>
<tr><th>Proof cockpit route</th><td>${record.proofRoute ? `<a href="${escapeHtml(record.proofRoute)}">${escapeHtml(record.proofRoute)}</a>` : "human-review-required"}</td></tr>
<tr><th>Route/API proof</th><td>human-review-required</td></tr>
<tr><th>Human QA action record</th><td>human-review-required</td></tr>
<tr><th>Service click-through evidence</th><td>human-review-required</td></tr>
<tr><th>Audit event</th><td>human-review-required</td></tr>
<tr><th>Logs metrics traces</th><td>human-review-required</td></tr>
<tr><th>Alert</th><td>human-review-required</td></tr>
<tr><th>Screenshot</th><td>human-review-required</td></tr>
<tr><th>Role used for QA</th><td>human-review-required</td></tr>
<tr><th>Dev readiness prerequisite evidence</th><td>docs/architecture/dev-readiness-validation-and-handover.md</td></tr>
<tr><th>Test readiness prerequisite evidence</th><td>docs/architecture/test-readiness-final-acceptance-gate.md</td></tr>
<tr><th>Proof run</th><td>human-review-required</td></tr>
<tr><th>Git SHA</th><td>${escapeHtml(getSourceSha())}</td></tr>
<tr><th>PR</th><td>pending draft PR</td></tr>
<tr><th>Linear issue</th><td>${LINEAR_ISSUE}</td></tr>
<tr><th>Runbook</th><td>human-review-required</td></tr>
<tr><th>Recorded QA actions</th><td>${recordedActions}</td></tr>
</tbody></table>
<section><h2>Record evidence review</h2>
${actionForm({
      actionType: "evidence-review",
      capabilityId: record.capabilityId,
      evidenceId: record.id,
      sourceUrl: record.target,
      actionName: `review ${record.title}`,
      returnTo: `/proof/evidence/${record.id}`,
    })}
</section>`,
  );
}

function renderMatrixPage(data, kind) {
  const rows = data.capabilities.map((capability) => `<tr>
<td><a href="/proof/capabilities/${escapeHtml(capability.id)}">${escapeHtml(capability.name)}</a></td>
<td>${escapeHtml(capability.domain)}</td>
<td>human-review-required</td>
<td>needs-runtime-wiring</td>
<td>correlation id review value</td>
</tr>`);
  return layout(titleCase(kind), table(["Capability", "Domain", "Evidence", "Status", "Correlation"], rows));
}

function renderFixtures(data) {
  const domainRows = [...new Set(data.capabilities.map((capability) => capability.domain))]
    .sort()
    .map((domain) => `<tr>
<td>${escapeHtml(domain)}</td>
<td>synthetic-${escapeHtml(domain)}-review</td>
<td>version unavailable</td>
<td>last reset unavailable</td>
<td>residual state unknown</td>
<td>no real tenant data required by final posture; human-review-required only</td>
</tr>`);
  const serviceRows = data.services
    .filter((service) => service.integration?.fixtureSeedId || service.integration?.lifecycleApi)
    .map((service) => {
      const lifecycle = service.integration.lifecycleApi ?? {};
      return `<tr>
<td>${serviceLink(service)}</td>
<td>${escapeHtml(service.integration.fixtureSeedId ?? "missing")}</td>
<td>${escapeHtml(lifecycle.seederId ?? "missing")}</td>
<td>${escapeHtml(lifecycle.resetterId ?? "missing")}</td>
<td>${escapeHtml(lifecycle.cleanupId ?? "missing")}</td>
<td>${escapeHtml(lifecycle.teardownId ?? "missing")}</td>
</tr>`;
    });
  return layout(
    "Proof fixtures",
    `<section>
<h2>Domain fixture mappings</h2>
${table(["Domain", "Fixture set", "Fixture version", "Last reset", "Residual state", "No real tenant data"], domainRows)}
</section>
<section>
<h2>Service lifecycle click-through requirements</h2>
${table(["Service", "Fixture seed", "Seeder", "Resetter", "Cleanup", "Teardown"], serviceRows)}
</section>`,
  );
}

function renderSignoff(data, state) {
  const rows = data.capabilities.map((capability) => `<tr>
<td><a href="/proof/capabilities/${escapeHtml(capability.id)}">${escapeHtml(capability.name)}</a></td>
<td>${escapeHtml(capability.firstPassState)}</td>
<td>${recordedActionCountFor(state, (action) => action.capabilityId === capability.id)}</td>
<td><label><input type="checkbox" disabled> final signoff unavailable</label></td>
</tr>`);
  return layout(
    "Proof signoff",
    `<p>Final human signoff controls are disabled. Final signoff remains unavailable until final USF-290 proofing is implemented.</p>
<p>Recorded QA actions: ${state.actions.length}. These are reviewable working records, not immutable final evidence.</p>
${table(["Capability", "State", "Recorded QA actions", "Signoff"], rows)}
<section>
<h2>Final signoff prerequisites requiring human confirmation</h2>
${unorderedList([
      "All capability, role, service, scenario, evidence, source, and enterprise actions reviewed by an authorised human auditor.",
      "All browser-entered QA actions promoted to immutable evidence artifacts with source SHA and timestamps.",
      "All stop conditions cleared or explicitly dispositioned with owner and rationale.",
      "Final USF-290 acceptance criteria mapped to evidence and checked in Linear.",
    ])}
</section>`,
  );
}

function renderResult(state) {
  return layout(
    "Proof result",
    `<p>Current result: machine evidence is reviewable and final human signoff is not auto-completed.</p>
<p>Recorded QA actions: ${state.actions.length}.</p>
<p>Eventual target decision text: full staging UI development may begin. Current state: unavailable.</p>
<p>No final acceptance artifact is created in this pass.</p>
${nonClaimsBlock()}`,
  );
}

function renderRunbook(data) {
  const routeRows = routeSummaryRows();
  const serviceCoverageRows = data.services.map((service) => {
    const integration = service.integration ?? {};
    return `<tr>
<td>${serviceLink(service)}</td>
<td>${escapeHtml((service.profileNames ?? []).join(", ") || "missing")}</td>
<td>${escapeHtml(integration.proofCommand ?? "human-review-required")}</td>
<td>${escapeHtml(integration.safeOperationEvidence ?? "human-review-required")}</td>
<td>${escapeHtml(service.firstPassClickThroughState)}</td>
</tr>`;
  });
  return layout(
    "Proof auditor runbook",
    `<p>This runbook is the controlled proof route and evidence checklist for a formal staging proof audit. It is intentionally explicit about missing evidence and disabled acceptance.</p>
<section>
<h2>Audit sequence</h2>
${orderedList(HUMAN_QA_STEPS)}
</section>
<section>
<h2>Route delivery map</h2>
${table(["Route", "Delivers", "Human QA action", "Required evidence"], routeRows)}
</section>
<section>
<h2>Machine proof to human work map</h2>
${table(["Proof area", "Issue", "Evidence source", "Human auditor work required"], machineProofWorkRows())}
</section>
<section>
<h2>Minimal browser UI required for complete staging proof</h2>
${table(["Proof area", "Required input or check", "Route", "Current state"], stagingProofUiRows())}
</section>
<section>
<h2>Service click-through coverage</h2>
${table(["Service", "Profiles", "Proof command", "Safe operation evidence", "State"], serviceCoverageRows)}
</section>
<section>
<h2>Stop conditions</h2>
${unorderedList(STOP_CONDITIONS)}
</section>
<section>
<h2>Current route completeness</h2>
<p>${ROUTES.length} route patterns are described. ${data.capabilities.length} capabilities and ${data.services.length} service catalogue rows are visible. Final evidence collection, role execution, and signoff remain unavailable in this final cockpit.</p>
</section>
${nonClaimsBlock()}`,
  );
}

function renderEnterpriseIndex(data) {
  return layout(
    "Enterprise evidence",
    `<p>Enterprise pages expose ISO 27001-style support mappings without claiming ISO certification, SOC readiness, enterprise production readiness, or production readiness.</p>
<section>
<h2>Enterprise staging proof requirements</h2>
<p>These are the enterprise and ISO/IEC 27001-supporting evidence areas that a formal staging proof auditor must verify. They support an ISMS evidence foundation only; they are not certification evidence by themselves.</p>
${table(["Requirement", "Required evidence", "Cockpit route", "Portfolio state"], enterpriseRequirementRows())}
</section>
<section>
<h2>ISO-supporting evidence fields</h2>
${unorderedList(ISO_SUPPORT_FIELDS)}
</section>
<section>
<h2>Enterprise topic pages</h2>
${table(
      ["Topic", "Purpose", "Mapped claims", "Owner", "Validation", "Result", "Human review"],
      data.enterpriseDomains.map(
        (domain) =>
          `<tr><td><a href="/proof/enterprise/${escapeHtml(domain.slug)}">${escapeHtml(domain.title)}</a></td><td>${escapeHtml(domain.purpose)}</td><td>${domain.claimIds.length}</td><td>${escapeHtml(domain.owner)}</td><td>${escapeHtml(domain.validationMethod)}</td><td>${escapeHtml(domain.result)}</td><td>${escapeHtml(domain.humanReviewStatus)}</td></tr>`,
      ),
    )}
</section>`,
  );
}

function renderEnterpriseTopic(data, state, slug) {
  const resolvedSlug = ENTERPRISE_DOMAIN_ALIASES[slug] ?? slug;
  const domain = data.enterpriseDomains.find((candidate) => candidate.slug === resolvedSlug);
  if (!domain) {
    return notFound(`Enterprise topic ${slug} was not found.`);
  }
  const recordedActions = recordedActionCountFor(state, (action) => action.enterpriseTopic === domain.slug);
  return layout(
    domain.title,
    `<p><a href="/proof/enterprise">Back to enterprise index</a></p>
<table><tbody>
<tr><th>Topic id</th><td>${escapeHtml(domain.slug)}</td></tr>
<tr><th>Purpose</th><td>${escapeHtml(domain.purpose)}</td></tr>
<tr><th>Mapped claims</th><td>${listLinks(domain.claimIds, "/proof/claims/")}</td></tr>
<tr><th>Evidence owner</th><td>${escapeHtml(domain.owner)}</td></tr>
<tr><th>Control owner</th><td>${escapeHtml(domain.owner)}</td></tr>
<tr><th>Validation</th><td>${escapeHtml(domain.validationMethod)}</td></tr>
<tr><th>Result</th><td>${escapeHtml(domain.result)}</td></tr>
<tr><th>Residual risk</th><td>${escapeHtml(domain.residualRisk)}</td></tr>
<tr><th>Review cadence</th><td>${escapeHtml(domain.reviewCadence)}</td></tr>
<tr><th>Human review status</th><td>${escapeHtml(domain.humanReviewStatus)}</td></tr>
<tr><th>Non-claim</th><td>${escapeHtml(domain.nonClaimBoundary)}</td></tr>
<tr><th>Recorded QA actions</th><td>${recordedActions}</td></tr>
</tbody></table>
<section>
<h2>Record enterprise evidence review</h2>
${actionForm({
      actionType: "enterprise-evidence-review",
      enterpriseTopic: domain.slug,
      actionName: `review enterprise topic ${domain.title}`,
      sourceUrl: `/proof/enterprise/${domain.slug}`,
      returnTo: `/proof/enterprise/${domain.slug}`,
    })}
</section>
<section>
<h2>Formal staging proof checks</h2>
${table(["Field", "Topic", "Current evidence", "Auditor requirement"], isoSupportRows(domain.slug))}
</section>
<section>
<h2>Enterprise stop conditions</h2>
${unorderedList([
      "No owner is assigned for a risk, control, evidence source, exception, or review cadence.",
      "A control-support row is treated as ISO certification, SOC readiness, or enterprise production readiness.",
      "Evidence depends on generated reports without raw source, validator, proof, or human confirmation evidence.",
      "Supplier, DNS, origin, CI, repository, Linear, or identity-provider dependencies are omitted from the asset or supplier boundary.",
      "A capability staging signoff lacks role, tenant, audit, observability, fixture, service, and screenshot/artifact evidence.",
    ])}
</section>`,
  );
}

function notFound(message) {
  return {
    status: 404,
    body: layout("Not found", `<p>${escapeHtml(message)}</p><p><a href="/proof">Back to proof home</a></p>`),
  };
}

function html(body) {
  return { status: 200, body };
}

function redirect(location) {
  return { status: 303, body: "", headers: { Location: location || "/proof/actions" } };
}

function page(result) {
  return typeof result === "string" ? html(result) : result;
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 128 * 1024) {
        reject(new Error("proof-cockpit-post-too-large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function safeReturnTo(value) {
  const target = String(value ?? "/proof/actions");
  return target.startsWith("/proof") && !target.startsWith("//") ? target : "/proof/actions";
}

async function handleProofPost(request, statePath) {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const routePath = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  if (routePath !== "/proof/actions") {
    return { status: 405, body: layout("Method not allowed", "<p>Only QA action form submissions are supported.</p>") };
  }
  const body = await readRequestBody(request);
  const params = new URLSearchParams(body);
  const state = loadProofState(statePath);
  const action = normalizeAction(params);
  state.actions.unshift(action);
  saveProofState(state, statePath);
  return redirect(safeReturnTo(params.get("returnTo")) || `/proof/actions/${action.id}`);
}

export function renderProofCockpit(pathname, data = buildData(), state = blankProofState(), url = new URL(pathname, "http://127.0.0.1")) {
  const routePath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (routePath === "/" || routePath === "/proof") {
    return html(renderHome(data, state));
  }
  if (routePath === "/proof/portfolio") {
    return html(renderPortfolio(data, state));
  }
  if (routePath === "/proof/claims") {
    return html(renderClaims(data));
  }
  if (routePath.startsWith("/proof/claims/")) {
    return page(renderClaim(data, state, decodeURIComponent(routePath.slice("/proof/claims/".length))));
  }
  if (routePath === "/proof/semantic-definitions") {
    return html(renderSemanticDefinitions(data));
  }
  if (routePath.startsWith("/proof/semantic-definitions/")) {
    return page(renderSemanticDefinition(data, state, decodeURIComponent(routePath.slice("/proof/semantic-definitions/".length))));
  }
  if (routePath === "/proof/qa") {
    return html(renderQa(data, state));
  }
  if (routePath === "/proof/foundation-substrate-closure") {
    return html(renderFoundationSubstrateClosure(data, state));
  }
  if (routePath === "/proof/actions") {
    return html(renderActions(state));
  }
  if (routePath.startsWith("/proof/actions/")) {
    return page(renderAction(state, decodeURIComponent(routePath.slice("/proof/actions/".length))));
  }
  if (routePath === "/proof/machine-runs") {
    return html(renderMachineRuns(state));
  }
  if (routePath.startsWith("/proof/machine-runs/")) {
    return page(renderMachineRun(state, decodeURIComponent(routePath.slice("/proof/machine-runs/".length))));
  }
  if (routePath === "/proof/import") {
    return html(renderImportIndex(state));
  }
  if (routePath.startsWith("/proof/import/")) {
    const parts = routePath.slice("/proof/import/".length).split("/");
    const runId = decodeURIComponent(parts[0] ?? "");
    if (parts[1] === "capabilities" && parts[2]) {
      return page(renderImportCapability(data, runId, decodeURIComponent(parts[2])));
    }
    return page(renderImportRun(data, runId));
  }
  if (routePath === "/proof/review") {
    return html(renderReview());
  }
  if (routePath === "/proof/review/gaps") {
    return html(renderReview("gaps"));
  }
  if (routePath === "/proof/review/nonconformities") {
    return html(renderReview("nonconformities"));
  }
  if (routePath === "/proof/review/corrective-actions") {
    return html(renderReview("corrective-actions"));
  }
  if (routePath.startsWith("/proof/review/")) {
    return page(renderReviewDetail(state, decodeURIComponent(routePath.slice("/proof/review/".length))));
  }
  if (routePath === "/proof/export") {
    return html(renderExport());
  }
  if (routePath === "/proof/reports") {
    return html(renderReportsIndex(data));
  }
  if (routePath === "/proof/reports/final") {
    return html(renderFinalReport(data, state));
  }
  if (routePath === "/proof/capabilities") {
    return html(renderCapabilities(data));
  }
  if (routePath.startsWith("/proof/capabilities/")) {
    return page(renderCapability(data, state, decodeURIComponent(routePath.slice("/proof/capabilities/".length))));
  }
  if (routePath === "/proof/services") {
    return html(renderServices(data));
  }
  if (routePath.startsWith("/proof/services/")) {
    return page(renderService(data, state, decodeURIComponent(routePath.slice("/proof/services/".length))));
  }
  if (routePath === "/proof/screenshots") {
    return html(renderScreenshots(data));
  }
  if (routePath.startsWith("/proof/screenshots/")) {
    return page(renderScreenshot(data, state, decodeURIComponent(routePath.slice("/proof/screenshots/".length))));
  }
  if (routePath === "/proof/evidence") {
    return html(renderEvidenceIndex(data));
  }
  if (routePath === "/proof/sources") {
    return html(renderSources());
  }
  if (routePath === "/proof/source") {
    return page(renderSourceFile(url));
  }
  if (routePath.startsWith("/proof/scenarios/")) {
    return page(renderScenario(data, state, decodeURIComponent(routePath.slice("/proof/scenarios/".length))));
  }
  if (routePath === "/proof/roles") {
    return html(renderRoles(data));
  }
  if (routePath.startsWith("/proof/evidence/")) {
    return page(renderEvidence(data, state, decodeURIComponent(routePath.slice("/proof/evidence/".length))));
  }
  if (routePath === "/proof/audit") {
    return html(renderMatrixPage(data, "audit"));
  }
  if (routePath === "/proof/observability") {
    return html(renderMatrixPage(data, "observability"));
  }
  if (routePath === "/proof/fixtures") {
    return html(renderFixtures(data));
  }
  if (routePath === "/proof/alerts") {
    return html(renderMatrixPage(data, "alerts"));
  }
  if (routePath === "/proof/signoff") {
    return html(renderSignoff(data, state));
  }
  if (routePath === "/proof/result") {
    return html(renderResult(state));
  }
  if (routePath === "/proof/runbook") {
    return html(renderRunbook(data));
  }
  if (routePath === "/proof/enterprise") {
    return html(renderEnterpriseIndex(data));
  }
  if (routePath.startsWith("/proof/enterprise/")) {
    return page(renderEnterpriseTopic(data, state, decodeURIComponent(routePath.slice("/proof/enterprise/".length))));
  }
  return notFound(`Route ${pathname} is not part of the proof cockpit.`);
}

export function createProofCockpitServer(options = {}) {
  const data = options.data ?? buildData();
  const statePath = statePathFromOptions(options);
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const result =
        request.method === "POST"
          ? await handleProofPost(request, statePath)
          : renderProofCockpit(url.pathname, data, loadProofState(statePath), url);
      response.writeHead(result.status, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...(result.headers ?? {}),
      });
      if (request.method === "HEAD") {
        response.end();
        return;
      }
      response.end(result.body);
    } catch (error) {
      response.writeHead(500, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(layout("Proof cockpit error", `<p>${escapeHtml(error?.message ?? error)}</p>`));
    }
  });
}

export function startProofCockpitServer(options = {}) {
  const host = options.host ?? process.env.PROOF_COCKPIT_HOST ?? "127.0.0.1";
  const port = Number(options.port ?? process.env.PROOF_COCKPIT_PORT ?? "3090");
  const server = createProofCockpitServer(options);
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve(server);
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startProofCockpitServer().catch((error) => {
    console.error(JSON.stringify({ outcome: "error", message: String(error?.message ?? error) }));
    process.exit(1);
  });
}
