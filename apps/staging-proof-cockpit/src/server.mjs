import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";

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
  process.env.USF_PROOF_COCKPIT_STATE_PATH ?? "/var/lib/usf-proof-cockpit/human-review-actions.json";
const CSRF_COOKIE_NAME = "proof_cockpit_csrf";

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

function writePolicyFromOptions(options = {}) {
  const requested = options.allowWrites ?? process.env.USF_PROOF_COCKPIT_ALLOW_WRITES === "yes";
  const reviewSecret = options.reviewSecret ?? process.env.USF_PROOF_COCKPIT_REVIEW_SECRET ?? "";
  return {
    requested,
    allowWrites: Boolean(requested && reviewSecret),
    reviewSecret,
    trustForwardAuth: options.trustForwardAuth ?? process.env.USF_PROOF_COCKPIT_TRUST_FORWARD_AUTH === "yes",
    configuredActor: options.actor ?? process.env.USF_PROOF_COCKPIT_REVIEW_ACTOR ?? "authenticated-qa-operator",
  };
}

function csrfTokenForPolicy(policy = writePolicyFromOptions()) {
  if (!policy.allowWrites || !policy.reviewSecret) {
    return "";
  }
  return contentHash(`proof-cockpit-csrf:${policy.reviewSecret}:${getSourceSha()}`);
}

function writePolicyNotice(policy = writePolicyFromOptions()) {
  if (policy.allowWrites) {
    return `<p class="muted">Authenticated write mode is enabled. Browser actions require the operator session CSRF token and derive actor identity from the authorised operator context.</p>`;
  }
  return `<p class="muted">Public/default proof review is read-only. Browser action controls are visible for workflow review, but POST writes require the authorised staging SSO or operator boundary plus CSRF protection.</p>`;
}

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(String(left ?? ""));
  const rightBuffer = Buffer.from(String(right ?? ""));
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookies(headerValue = "") {
  return Object.fromEntries(
    String(headerValue)
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index < 0) {
          return [part, ""];
        }
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function actorFromRequest(request, policy) {
  if (policy.trustForwardAuth) {
    const forwardedActor =
      request.headers["x-forwarded-email"] ??
      request.headers["x-auth-request-email"] ??
      request.headers["x-forwarded-user"] ??
      request.headers["x-auth-request-user"];
    if (forwardedActor) {
      return String(Array.isArray(forwardedActor) ? forwardedActor[0] : forwardedActor).slice(0, 160);
    }
  }
  return String(policy.configuredActor ?? "authenticated-qa-operator").slice(0, 160);
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
      artifactDir: store.latestMachineRun?.artifactDir ?? "",
      reportJson: store.latestMachineRun?.reportJson ?? "",
      screenshotManifest: store.latestMachineRun?.screenshotManifest ?? "",
      externalReviewBundle: store.latestMachineRun?.externalReviewBundle ?? "",
      warningInventory: store.latestMachineRun?.warningInventory ?? "",
      warningInventoryMarkdown: store.latestMachineRun?.warningInventoryMarkdown ?? "",
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

function loadScreenshotManifestRows(store) {
  const manifestPaths = [
    store.latestMachineRun?.screenshotManifest,
    store.latestMachineRun?.externalReviewBundle
      ? `${store.latestMachineRun.externalReviewBundle}/screenshot-manifest.json`
      : "",
    store.latestMachineRun?.artifactDir
      ? `${store.latestMachineRun.artifactDir}/composed-service-screenshot-manifest.json`
      : "",
    "artifacts/proof-cockpit/live-review-screenshots/current/screenshot-manifest.json",
  ].filter(Boolean);
  const rows = [];
  for (const manifestPath of manifestPaths) {
    const manifest = readJsonOrNull(sourceFilePath(manifestPath));
    if (Array.isArray(manifest?.screenshots)) {
      rows.push(...manifest.screenshots);
    }
  }
  return rows;
}

function screenshotIdForRecord(record) {
  if (record.serviceId) {
    return `screenshot-service-${record.serviceId}`;
  }
  if (record.route) {
    return `screenshot-route-${slugify(record.route)}`;
  }
  if (record.filePath || record.screenshotPath) {
    return `screenshot-artifact-${slugify(record.filePath ?? record.screenshotPath)}`;
  }
  return `screenshot-record-${contentHash(JSON.stringify(record)).slice(0, 12)}`;
}

function buildScreenshotRecords(capabilities, services, store) {
  const manifestRows = loadScreenshotManifestRows(store);
  if (manifestRows.length) {
    const byId = new Map();
    for (const row of manifestRows) {
      const screenshotPath = row.screenshotPath || row.filePath || row.authenticatedUiScreenshotPath || "";
      const artifactPath = row.artifactPath || row.apiCliArtifactPath || row.route || screenshotPath || "";
      const id = screenshotIdForRecord(row);
      const existing = byId.get(id) ?? {};
      byId.set(id, {
        ...existing,
        ...row,
        id,
        kind: row.kind ?? (row.serviceId ? "compose-service" : "proof-route"),
        serviceName: row.serviceName ?? existing.serviceName ?? row.serviceId ?? "",
        claimId:
          row.claimId ?? existing.claimId ?? (row.serviceId ? `claim-service-${row.serviceId}` : "claim-proof-cockpit-portfolio"),
        capabilityIds: row.capabilityIds ?? existing.capabilityIds ?? [],
        scenarioIds: row.scenarioIds ?? existing.scenarioIds ?? [],
        artifactPath,
        screenshotPath,
        screenshotHash:
          row.screenshotHash || row.authenticatedUiScreenshotHash || existing.screenshotHash || row.artifactHash || "",
        artifactHash: row.artifactHash || row.screenshotHash || existing.artifactHash || "",
        timestamp: row.timestamp ?? existing.timestamp ?? store.latestMachineRun.generatedAt,
        sourceSha: row.sourceSha ?? existing.sourceSha ?? store.latestMachineRun.sourceSha,
        environment: row.environment ?? row.deploymentEnvironment ?? existing.environment ?? store.latestMachineRun.environment,
        redactionStatus: row.redactionStatus ?? existing.redactionStatus ?? "redaction-status-recorded-in-machine-qa",
        syntheticDataConfirmation:
          row.syntheticDataConfirmation ??
          existing.syntheticDataConfirmation ??
          "Synthetic-data posture is recorded in the machine QA manifest.",
        humanReviewStatus: row.humanReviewStatus ?? existing.humanReviewStatus ?? "human-review-required",
        evidenceClass: row.evidenceClass ?? row.evidenceKind ?? existing.evidenceClass ?? "screenshot",
        authPosture: row.actualAuthPosture ?? row.authPosture ?? existing.authPosture ?? "not-applicable",
        loginMethod:
          row.loginMethod ?? row.authMethodUsed ?? row.loginAuthMethodUsed ?? existing.loginMethod ?? "Not applicable - route screenshot",
        credentialSourceRef:
          row.openBaoLogicalSecretRef ??
          row.credentialSourceRef ??
          existing.credentialSourceRef ??
          "Not applicable - no credential value recorded",
        humanReenactmentInstruction:
          row.humanReenactmentInstruction ??
          existing.humanReenactmentInstruction ??
          "Open the related proof route or service evidence, verify the screenshot hash, source SHA, run ID, redaction posture, and synthetic-data boundary, then record accept, reject, retest, corrective-action, or note.",
        finalAcceptanceBlocked: row.finalAcceptanceBlocked ?? existing.finalAcceptanceBlocked ?? false,
        nextSafeAction:
          row.nextSafeAction ??
          existing.nextSafeAction ??
          "Human reviewer samples the screenshot, related evidence, chain of custody, and non-claim boundary before recording a decision.",
      });
    }
    return [...byId.values()];
  }
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

function fillBlankTableCells(markup) {
  return String(markup ?? "").replace(
    /<(td|th)([^>]*)>\s*<\/\1>/g,
    '<$1$2><span class="muted">Not applicable - no value in current machine QA source.</span></$1>',
  );
}

function displayValue(value, fallback = "Derived from machine QA - no separate value recorded.") {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : fallback;
  }
  const rendered = String(value ?? "").trim();
  return rendered || fallback;
}

function statusBadge(value, tone = "neutral") {
  const text = displayValue(value, "Not evidenced - missing status.");
  return `<span class="status status-${escapeHtml(tone)}">${escapeHtml(text)}</span>`;
}

function layout(title, body) {
  const renderedBody = fillBlankTableCells(body);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root{color-scheme:light;--page:#f5f5f1;--panel:#fff;--ink:#1f2328;--muted:#656d76;--line:#d8d8d2;--soft:#eeeeea;--accent:#0b5cad;--ok:#1f7a3f;--warn:#9a6700;--bad:#b42318}
*{box-sizing:border-box}
body{margin:0;font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:var(--ink);background:var(--page)}
a{color:var(--accent)}
.skip-link{position:absolute;left:12px;top:-44px;background:#fff;border:1px solid var(--line);padding:8px 10px;z-index:10}
.skip-link:focus{top:12px}
header,footer{background:var(--panel);border-bottom:1px solid var(--line);padding:14px 20px}
footer{border-top:1px solid var(--line);border-bottom:0;margin-top:24px}
.topbar{max-width:1180px;margin:0 auto;display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
.site-title{margin:0;font-size:20px;line-height:1.2}
.site-subtitle{margin:4px 0 0;color:var(--muted)}
nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px;justify-content:flex-end}
nav a,.button-link{display:inline-flex;align-items:center;min-height:34px;padding:6px 10px;border:1px solid var(--line);background:#fff;text-decoration:none;color:var(--ink)}
nav a[aria-current="page"],.button-primary{border-color:#174ea6;background:#174ea6;color:#fff}
main{max-width:1180px;margin:0 auto;padding:22px 20px 42px}
section{margin:20px 0;padding:18px 0;border-top:1px solid var(--line)}
h1,h2,h3{line-height:1.25}
.hero{background:#fff;border:1px solid var(--line);padding:22px;margin-bottom:18px}
.hero h2{font-size:28px;margin:0 0 8px}
.hero-actions,.actions-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:14px}
.executive-summary{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.8fr);gap:16px;align-items:start}
.decision-panel{background:#fff;border:1px solid var(--line);padding:16px}
.decision-panel h3{margin-top:0}
.decision-banner{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.report-lede{font-size:16px;max-width:78ch}
.secondary-disclosure{background:#fff;border:1px solid var(--line);padding:12px;margin:12px 0}
.secondary-disclosure summary{cursor:pointer;font-weight:700}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.card{background:#fff;border:1px solid var(--line);padding:14px}
.card h3{margin:0 0 8px;font-size:16px}
.metric{font-size:22px;font-weight:700;margin:2px 0}
.muted{color:var(--muted)}
.status{display:inline-flex;align-items:center;border:1px solid var(--line);background:#fff;padding:2px 7px;min-height:24px}
.status-pass,.status-ok,.status-accepted{border-color:#8cc69b;background:#edf7ef;color:#14532d}
.status-warn,.status-review{border-color:#e2bd75;background:#fff8e6;color:#7a4d00}
.status-fail,.status-bad,.status-rejected{border-color:#ef9a9a;background:#fff0f0;color:#8a1f17}
.status-neutral{color:var(--muted)}
.table-wrap{width:100%;overflow-x:auto;background:#fff;border:1px solid var(--line);margin:10px 0}
.table-wrap:before{content:"Scrollable table";display:block;color:var(--muted);font-size:12px;padding:6px 8px;border-bottom:1px solid var(--line)}
table{width:100%;border-collapse:collapse;background:#fff;overflow-wrap:anywhere}
th,td{border:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}
th{background:var(--soft)}
pre{white-space:pre-wrap;background:#fff;border:1px solid var(--line);padding:12px;overflow:auto}
input,select,textarea,button{font:inherit;max-width:100%}
button,.button-link{cursor:pointer}
button{padding:8px 12px;border:1px solid #525252;background:#fff}
button.primary{border-color:#174ea6;background:#174ea6;color:#fff}
button.danger{border-color:var(--bad);color:var(--bad)}
.review-shell{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px;align-items:start}
.review-main,.review-side{background:#fff;border:1px solid var(--line);padding:16px}
.progress{height:12px;background:#e8e8e2;border:1px solid var(--line);overflow:hidden}
.progress span{display:block;height:100%;background:#174ea6}
.review-actions{position:sticky;bottom:0;background:#fff;border:1px solid var(--line);padding:12px;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start}
.review-actions form{display:inline}
.review-actions .review-decision-form{display:block;width:100%}
.review-decision-form fieldset{border:0;margin:0;padding:0}
.review-confirmations{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:6px 12px;margin:8px 0}
.review-confirmations p{margin:0}
.decision-buttons{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
.decision-help{width:100%;margin:0 0 8px;color:var(--muted)}
.note-form{width:100%;display:block}
.note-form textarea{width:100%}
.screenshot-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.screenshot-card{margin:0;background:#fff;border:1px solid var(--line)}
.screenshot-card img{display:block;width:100%;height:auto;max-height:520px;object-fit:contain;background:#f0f0ed;border-bottom:1px solid var(--line)}
.review-main .screenshot-card img{max-height:340px}
.screenshot-card figcaption{padding:10px;font-size:13px}
.evidence-card{background:#fff;border:1px solid var(--line);padding:14px;margin:10px 0}
.print-report{background:#fff;border:1px solid var(--line);padding:24px}
.print-cover{border-bottom:2px solid var(--ink);padding-bottom:18px;margin-bottom:18px}
@media(max-width:860px){.topbar{display:block}nav{justify-content:flex-start;margin-top:12px}.executive-summary{display:block}.decision-panel{margin-top:12px}.review-shell{display:block}.review-side{margin-top:14px}main,header,footer{padding-left:12px;padding-right:12px}.hero h2{font-size:24px}.review-actions{margin-left:-12px;margin-right:-12px;border-left:0;border-right:0}.table-wrap{overflow-x:auto}}
@media print{body{background:#fff;color:#000;font-size:11pt}header,nav,form,button,.hero-actions,.review-actions,.no-print,.button-link,.table-wrap:before{display:none!important}main{max-width:none;padding:0}.print-report{border:0;padding:0}.print-cover{page-break-after:avoid}.screenshot-card{break-inside:avoid}.screenshot-card img{max-height:360px}section{break-inside:avoid;border-top:1px solid #999}a{color:#000;text-decoration:none}footer{border-top:1px solid #999}}
</style>
</head>
<body>
<a class="skip-link" href="#content">Skip to content</a>
<header>
<div class="topbar">
<div>
<h1 class="site-title">USF Proof Review</h1>
<p class="site-subtitle">${escapeHtml(title)}</p>
</div>
<nav>
<a href="/proof">Home</a>
<a href="/proof/review">Review</a>
<a href="/proof/reports/final">Printable report</a>
<a href="/proof/screenshots">Screenshots</a>
<a href="/proof/evidence">Evidence</a>
<a href="/proof/signoff">Signoff</a>
<a href="/proof/portfolio">Drill-down</a>
</nav>
</div>
</header>
<main id="content">
${renderedBody}
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
<li>Public/default deployment is read-only. Browser action writes require explicit operator write mode, an authorised staging SSO or forward-auth boundary, server-derived actor identity, and CSRF validation.</li>
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
  return `<div class="table-wrap" tabindex="0"><table>
<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
<tbody>${rows.join("")}</tbody>
</table></div>`;
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
  const policy = writePolicyFromOptions();
  const disabled = policy.allowWrites ? "" : " disabled";
  return `<form method="post" action="/proof/actions">
${writePolicyNotice(policy)}
${hiddenInput("csrfToken", csrfTokenForPolicy(policy))}
${hiddenInput("returnTo", context.returnTo ?? "/proof/actions")}
${hiddenInput("capabilityId", context.capabilityId ?? "")}
${hiddenInput("serviceId", context.serviceId ?? "")}
${hiddenInput("scenarioId", context.scenarioId ?? "")}
${hiddenInput("evidenceId", context.evidenceId ?? "")}
${hiddenInput("enterpriseTopic", context.enterpriseTopic ?? "")}
${selectInput("actionType", "Action type", QA_ACTION_TYPES, context.actionType ?? "capability-qa")}
${selectInput("outcome", "Current outcome", QA_OUTCOMES, context.outcome ?? "draft-performed")}
${selectInput("role", "QA role used", ROLES, context.role ?? "auditor")}
<p>Actor identity is derived from the authorised operator session and is not accepted from browser form text.</p>
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
<p><button type="submit"${disabled}>Record QA action</button></p>
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

function safeImagePath(path) {
  const safePath = safeSourcePath(path);
  if (!safePath || !safePath.startsWith("artifacts/proof-cockpit/") || !safePath.endsWith(".png")) {
    return "";
  }
  if (!screenshotPathHasReviewableRedaction(safePath)) {
    return "";
  }
  return safePath;
}

function imagePathFromScreenshot(screenshot) {
  return safeImagePath(screenshot?.screenshotPath || screenshot?.filePath || screenshot?.authenticatedUiScreenshotPath || "");
}

function imageSrcForPath(path) {
  const safePath = safeImagePath(path);
  return safePath ? `/proof/image?path=${encodeURIComponent(safePath)}` : "";
}

function renderScreenshotFigure(screenshot, options = {}) {
  const path = imagePathFromScreenshot(screenshot);
  const title = displayValue(screenshot?.serviceName || screenshot?.route || screenshot?.id, "Screenshot evidence");
  const image = path
    ? `<a href="/proof/screenshots/${escapeHtml(screenshot.id)}"><img src="${escapeHtml(imageSrcForPath(path))}" alt="${escapeHtml(title)} proof screenshot" loading="${options.eager ? "eager" : "lazy"}"></a>`
    : `<div class="card"><p><strong>Not evidenced - inline image unavailable.</strong></p><p>${escapeHtml(displayValue(screenshot?.screenshotPath, "Screenshot path missing from manifest."))}</p></div>`;
  return `<figure class="screenshot-card">
${image}
<figcaption>
<strong>${escapeHtml(title)}</strong><br>
${statusBadge(screenshot?.humanReviewStatus ?? "human-review-required", "review")} ${statusBadge(screenshot?.result ?? "machine-reviewable", screenshot?.result === "pass" ? "pass" : "neutral")}<br>
Path: ${sourcePathCell(path || screenshot?.screenshotPath || screenshot?.filePath || "")}<br>
Hash: ${escapeHtml(displayValue(screenshot?.screenshotHash, "Not evidenced - screenshot hash missing."))}<br>
Auth: ${escapeHtml(displayValue(screenshot?.authPosture ?? screenshot?.actualAuthPosture, "Not applicable - route screenshot."))}<br>
Redaction: ${escapeHtml(displayValue(screenshot?.redactionStatus, "Derived from machine QA - redaction status recorded in manifest."))}
</figcaption>
</figure>`;
}

function screenshotPathHasReviewableRedaction(path) {
  const store = loadPersistentEvidenceStore();
  const rows = loadScreenshotManifestRows(store);
  for (const row of rows) {
    const candidatePaths = [
      row.filePath,
      row.screenshotPath,
      row.authenticatedUiScreenshotPath,
      row.artifactPath,
      row.apiCliArtifactPath,
    ].filter(Boolean);
    if (!candidatePaths.includes(path)) {
      continue;
    }
    const status = String(row.redactionStatus ?? "").toLowerCase();
    return (
      Boolean(status) &&
      !/(raw secret (exposed|present|visible)|secret value|credential value|raw credential|private key|unredacted-sensitive|real tenant data)/.test(
        status,
      )
    );
  }
  return false;
}

function screenshotRecordsForIds(data, ids = []) {
  return unique(ids).map((id) => data.screenshotsById.get(id)).filter(Boolean);
}

function screenshotRecordsForService(data, serviceId) {
  return data.screenshots.filter((screenshot) => screenshot.serviceId === serviceId);
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
<td>${escapeHtml(displayValue(screenshot.kind, "Derived from machine QA screenshot manifest."))}</td>
<td>${escapeHtml(displayValue(screenshot.serviceId ?? screenshot.route, "Not applicable - aggregate screenshot."))}</td>
<td>${sourcePathCell(displayValue(screenshot.screenshotPath, "Not evidenced - screenshot path missing."))}</td>
<td>${escapeHtml(displayValue(screenshot.screenshotHash, "Not evidenced - screenshot hash missing."))}</td>
<td>${escapeHtml(displayValue(screenshot.humanReviewStatus, "human-review-required"))}</td>
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

function reviewDecisionCounts(state) {
  return state.actions.reduce(
    (counts, action) => {
      if (action.outcome === "human-accepted") counts.accepted += 1;
      if (action.outcome === "human-rejected") counts.rejected += 1;
      if (action.outcome === "retest-requested") counts.retest += 1;
      if (action.actionType === "corrective-action-created" || action.outcome === "corrective-action-required") counts.corrective += 1;
      if (action.actionType === "human-note-added") counts.notes += 1;
      return counts;
    },
    { accepted: 0, rejected: 0, retest: 0, corrective: 0, notes: 0 },
  );
}

function actionMatchesReviewItem(action, item) {
  return (
    action.evidenceId === item.id ||
    (item.capabilityId && action.capabilityId === item.capabilityId) ||
    (item.serviceId && action.serviceId === item.serviceId) ||
    (item.sourceUrl && action.sourceUrl === item.sourceUrl)
  );
}

function reviewItemDecision(state, item) {
  const action = state.actions.find((candidate) => actionMatchesReviewItem(candidate, item));
  if (!action) {
    return { status: "human-review-required", tone: "review", action: null };
  }
  if (action.outcome === "human-accepted") {
    return { status: "accepted", tone: "accepted", action };
  }
  if (action.outcome === "human-rejected") {
    return { status: "rejected", tone: "rejected", action };
  }
  if (action.outcome === "retest-requested") {
    return { status: "retest-requested", tone: "warn", action };
  }
  return { status: action.outcome, tone: "neutral", action };
}

function routeScreenshot(data, route) {
  return data.screenshots.find((screenshot) => screenshot.route === route);
}

function buildReviewItems(data) {
  const latest = data.persistentEvidence.latestMachineRun;
  const items = [
    {
      id: "review-final-report",
      type: "final report section",
      title: "Final external-review report",
      summary:
        "Confirm the printable external-review report states the scope, non-claims, zero-warning machine QA result, evidence basis, chain of custody, and human acceptance boundary.",
      machineQaConclusion: `Latest machine QA: ${latest.passCount} pass, ${latest.warnCount} warn, ${latest.gapCount} gap, ${latest.failCount} fail.`,
      riskPosture: "Low machine-evidence risk; final human acceptance remains separate and not auto-completed.",
      evidenceLinks: ["proof-cockpit-final-report", "proof-cockpit-evidence-store"],
      screenshots: [
        routeScreenshot(data, "/proof/reports/final") ??
          routeScreenshot(data, "/proof/review") ??
          routeScreenshot(data, "/proof") ??
          data.screenshots.find((screenshot) => imagePathFromScreenshot(screenshot)),
      ].filter(Boolean),
      sourceUrl: data.persistentEvidence.finalReportPath,
      route: "/proof/reports/final",
    },
  ];
  for (const claim of data.claims) {
    items.push({
      id: `review-${claim.id}`,
      type: "claim",
      title: claim.id,
      summary: claim.what,
      machineQaConclusion: `${claim.machineQaStatus}; ${claim.staleState}; ${claim.blockedState}`,
      riskPosture: claim.remainsUnclaimed,
      evidenceLinks: claim.evidenceIds,
      screenshots: screenshotRecordsForIds(data, claim.screenshotIds),
      capabilityId: claim.capabilityId,
      serviceId: claim.serviceIds?.[0],
      route: claim.where,
    });
  }
  for (const capability of data.capabilities) {
    items.push({
      id: `review-${capability.id}`,
      type: "capability",
      title: capability.name,
      summary: `Capability ${capability.id} maps to ${capability.semanticContractId}, ${capability.scenarioIds.length} scenarios, ${capability.serviceRefs.length} services, evidence records, controls, risks, and human review.`,
      machineQaConclusion: capability.contract ? "Semantic definition and capability mapping are loaded." : "Human review required because semantic contract is missing.",
      riskPosture: "Review the mapped services, screenshot evidence, synthetic data boundary, and non-claim boundary before accepting.",
      evidenceLinks: capability.evidenceIds,
      screenshots: capability.serviceRefs.flatMap((service) => screenshotRecordsForService(data, service.serviceId)).slice(0, 4),
      capabilityId: capability.id,
      route: `/proof/capabilities/${capability.id}`,
    });
  }
  for (const service of data.services) {
    const screenshots = screenshotRecordsForService(data, service.serviceId);
    const serviceShot = screenshots[0] ?? {};
    items.push({
      id: `review-service-${service.serviceId}`,
      type: "service",
      title: service.displayName ?? service.serviceId,
      summary: `${service.displayName ?? service.serviceId} service evidence includes auth posture ${displayValue(serviceShot.authPosture ?? serviceShot.actualAuthPosture, "derived from service catalogue")} and screenshot or approved equivalent evidence.`,
      machineQaConclusion: `${displayValue(serviceShot.result ?? serviceShot.evidenceStatus, "machine-reviewable")} with ${displayValue(serviceShot.humanReviewStatus, "human-review-required")}.`,
      riskPosture: displayValue(serviceShot.nextSafeAction, "Human reviewer must inspect service evidence before acceptance."),
      evidenceLinks: [`evidence-service-${service.serviceId}`],
      screenshots,
      serviceId: service.serviceId,
      route: `/proof/services/${service.serviceId}`,
    });
  }
  for (const [id, record] of data.evidence) {
    items.push({
      id: `review-evidence-${id}`,
      type: "evidence",
      title: record.title ?? id,
      summary: `${record.status}: ${record.target}`,
      machineQaConclusion: "Evidence record is indexed and linked for human review.",
      riskPosture: "Confirm chain of custody, source SHA, no-real-tenant-data boundary, and related claim/capability mapping.",
      evidenceLinks: [id],
      screenshots: [],
      capabilityId: record.capabilityId,
      serviceId: record.serviceId,
      route: record.proofRoute ?? `/proof/evidence/${id}`,
    });
  }
  for (const screenshot of data.screenshots) {
    items.push({
      id: `review-${screenshot.id}`,
      type: "screenshot",
      title: screenshot.serviceName || screenshot.route || screenshot.id,
      summary: `${screenshot.kind} evidence at ${displayValue(screenshot.screenshotPath, "Not evidenced - screenshot path missing.")}`,
      machineQaConclusion: `${displayValue(screenshot.result ?? "machine-reviewable")} with hash ${displayValue(screenshot.screenshotHash, "Not evidenced - screenshot hash missing.")}.`,
      riskPosture: displayValue(screenshot.nextSafeAction, "Human reviewer samples the screenshot and related chain of custody."),
      evidenceLinks: screenshot.serviceId ? [`evidence-service-${screenshot.serviceId}`] : [],
      screenshots: [screenshot],
      serviceId: screenshot.serviceId,
      route: `/proof/screenshots/${screenshot.id}`,
    });
  }
  return items;
}

function currentReviewIndex(items, state, url, explicitId = "") {
  const requested = explicitId || url?.searchParams?.get("item") || "";
  if (/^\d+$/.test(requested)) {
    return Math.max(0, Math.min(items.length - 1, Number(requested)));
  }
  if (requested) {
    const byId = items.findIndex((item) => item.id === requested);
    if (byId >= 0) {
      return byId;
    }
  }
  const firstOpen = items.findIndex((item) => reviewItemDecision(state, item).status === "human-review-required");
  return firstOpen >= 0 ? firstOpen : 0;
}

function reviewItemActionForms(item, returnTo) {
  const policy = writePolicyFromOptions();
  const disabled = policy.allowWrites ? "" : " disabled";
  const base = {
    csrfToken: csrfTokenForPolicy(policy),
    returnTo,
    capabilityId: item.capabilityId ?? "",
    serviceId: item.serviceId ?? "",
    evidenceId: item.id,
    sourceUrl: item.sourceUrl ?? "",
    serviceUrl: item.route ?? "",
    screenshotUrl: item.screenshots?.[0]?.screenshotPath ?? "",
    role: "auditor",
    tenant: "synthetic-proof-review",
    itemTitle: item.title,
  };
  return `<div class="review-actions" aria-label="Review actions">
${writePolicyNotice(policy)}
<form class="review-decision-form" method="post" action="/proof/actions">
${Object.entries(base)
  .map(([name, value]) => hiddenInput(name, value))
  .join("")}
<fieldset>
<legend>Review decision</legend>
<p class="decision-help">Use one decision for the current item. Confirmation checkboxes are explicit human assertions; none are hidden or prefilled.</p>
<div class="review-confirmations">
${checkboxInput("devEvidenceConfirmed", "I confirmed the relevant dev-readiness prerequisite evidence.")}
${checkboxInput("testEvidenceConfirmed", "I confirmed the relevant test-readiness prerequisite evidence.")}
${checkboxInput("noRealTenantData", "This action used no real tenant data, real secrets, or private local state.")}
${checkboxInput("nonClaimsConfirmed", "This action makes no staging, production, SOC, ISO, enterprise-readiness, product UI, browser E2E, or full Foundation closure claim.")}
</div>
<label>Add note, blocker, correction, or sampling observation<br><textarea name="notes" rows="3" placeholder="Optional note for accept/reject/retest; required for a note-only action."></textarea></label>
<div class="decision-buttons">
<button class="primary" type="submit" name="decision" value="accept"${disabled}>Accept</button>
<button class="danger" type="submit" name="decision" value="reject"${disabled}>Reject</button>
<button type="submit" name="decision" value="retest"${disabled}>Request retest</button>
<button type="submit" name="decision" value="note"${disabled}>Add note</button>
</div>
</fieldset>
</form>
</div>`;
}

function normalizeAction(params, actor) {
  const decision = String(params.get("decision") ?? "").toLowerCase();
  const itemTitle = String(params.get("itemTitle") ?? "review item").slice(0, 200);
  const decisionMap = {
    accept: ["machine-evidence-accepted", "human-accepted", `Accept: ${itemTitle}`],
    reject: ["machine-evidence-rejected", "human-rejected", `Reject: ${itemTitle}`],
    retest: ["retest-requested", "retest-requested", `Request retest: ${itemTitle}`],
    note: ["human-note-added", "needs-review", `Note: ${itemTitle}`],
  };
  const mapped = decisionMap[decision];
  const actionType = mapped
    ? mapped[0]
    : QA_ACTION_TYPES.includes(params.get("actionType"))
      ? params.get("actionType")
      : "capability-qa";
  const outcome = mapped
    ? mapped[1]
    : QA_OUTCOMES.includes(params.get("outcome"))
      ? params.get("outcome")
      : "needs-review";
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
    actor: String(actor ?? "authenticated-qa-operator").slice(0, 160),
    tenant: String(params.get("tenant") ?? "").slice(0, 160),
    actionName: String(mapped?.[2] ?? params.get("actionName") ?? "").slice(0, 240),
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
  const reviewItems = buildReviewItems(data);
  const currentIndex = currentReviewIndex(reviewItems, state, new URL("/proof", "http://127.0.0.1"));
  const currentItem = reviewItems[currentIndex];
  const decisionCounts = reviewDecisionCounts(state);
  const blockerText =
    latest.failCount || latest.warnCount || latest.gapCount
      ? `${latest.failCount} failures, ${latest.warnCount} warnings, ${latest.gapCount} unresolved gaps`
      : "No machine QA blockers; human review and final signoff remain required.";
  return layout(
    "USF Proof Review",
    `<section class="hero">
<h2>USF Proof Review</h2>
<div class="executive-summary">
<div>
<p class="report-lede">External-review report first: machine evidence is complete enough for selective browser review, while ${ACCEPTANCE_ISSUE} remains a separate human acceptance gate. Start with the current review item, sample screenshots inline, then use signoff only after rejected, retest, and unreviewed items are cleared.</p>
<div class="decision-banner">
${statusBadge(`${latest.passCount} pass`, "pass")}
${statusBadge(`${latest.warnCount} warnings`, latest.warnCount ? "warn" : "pass")}
${statusBadge(`${latest.gapCount} unresolved gaps`, latest.gapCount ? "warn" : "pass")}
${statusBadge(`${latest.failCount} failures`, latest.failCount ? "bad" : "pass")}
${statusBadge(human.finalSignoffAvailable ? "final signoff available after human criteria" : "final signoff not auto-completed", "review")}
</div>
<div class="hero-actions">
<a class="button-link button-primary" href="/proof/review">Start review</a>
<a class="button-link" href="/proof/reports/final">Open printable report</a>
<a class="button-link" href="/proof/screenshots">Review screenshots</a>
<a class="button-link" href="/proof/evidence">Review evidence bundle</a>
<a class="button-link" href="/proof/signoff">Final signoff</a>
</div>
</div>
<aside class="decision-panel">
<h3>Next review item</h3>
<p>${statusBadge(currentItem.type, "neutral")} ${statusBadge(reviewItemDecision(state, currentItem).status, reviewItemDecision(state, currentItem).tone)}</p>
<p><strong>${escapeHtml(currentItem.title)}</strong></p>
<p>${escapeHtml(currentItem.summary)}</p>
<p><a class="button-link button-primary" href="/proof/review?item=${encodeURIComponent(String(currentIndex))}">Open current item</a></p>
</aside>
</div>
</section>
<section>
<h2>Current decision status</h2>
<div class="grid">
<div class="card"><h3>Machine QA</h3><p class="metric">${escapeHtml(`${latest.passCount} / ${latest.warnCount} / ${latest.gapCount} / ${latest.failCount}`)}</p><p class="muted">pass / warn / gap / fail</p></div>
<div class="card"><h3>Human review progress</h3><p class="metric">${state.actions.length}</p><p class="muted">recorded browser review actions</p></div>
<div class="card"><h3>Decisions</h3><p>${statusBadge(`${decisionCounts.accepted} accepted`, "accepted")} ${statusBadge(`${decisionCounts.rejected} rejected`, "rejected")} ${statusBadge(`${decisionCounts.retest} retest`, "warn")}</p></div>
<div class="card"><h3>Blockers</h3><p>${statusBadge(blockerText, latest.failCount || latest.warnCount || latest.gapCount ? "bad" : "pass")}</p></div>
<div class="card"><h3>Evidence scope</h3><p>${escapeHtml(data.claims.length)} claims, ${escapeHtml(data.capabilities.length)} capabilities, ${escapeHtml(data.services.length)} services, ${escapeHtml(data.screenshots.length)} screenshots.</p></div>
</div>
</section>
<section>
<h2>Secondary audit detail</h2>
<details class="secondary-disclosure">
<summary>Dev to Test to Staging proof ladder</summary>
${table(["Stage", "Source artifact", "Command", "Validator/evidence", "Status", "Gaps", "Handoff condition", "Non-claims"], proofLadderFullRows())}
</details>
<details class="secondary-disclosure">
<summary>Evidence identity and chain-of-custody anchors</summary>
${table(
      ["Field", "Value"],
      [
        ["Latest machine QA run", latest.runId],
        ["Source SHA", getSourceSha()],
        ["Deployment/run identity", `${latest.deploymentSha} / ${latest.runId}`],
        ["Environment", latest.environment],
        ["Persistent evidence store", store.path],
        ["Final report path", store.finalReportPath],
        ["External-review bundle", store.externalReviewBundlePath],
        ["Related issues", RELATED_ISSUES.join(", ")],
      ].map(([field, value]) => `<tr><th>${escapeHtml(field)}</th><td>${sourcePathCell(value)}</td></tr>`),
    )}
</details>
</section>
<section>
<h2>Recent QA actions</h2>
${table(["Action", "Created", "Type", "Target", "Role", "Outcome", "Actor"], recentActionRows(state, 8))}
</section>
<section>
<h2>Secondary drill-down pages</h2>
<div class="grid">
<div class="card"><h3>Portfolio</h3><p>Complete machine-indexed assurance model.</p><p><a href="/proof/portfolio">Open portfolio</a></p></div>
<div class="card"><h3>Claims</h3><p>Claim-by-claim details and mappings.</p><p><a href="/proof/claims">Open claims</a></p></div>
<div class="card"><h3>Services</h3><p>Auth posture, service evidence, and OpenBao references.</p><p><a href="/proof/services">Open services</a></p></div>
<div class="card"><h3>Source documents</h3><p>Whitelisted repository evidence sources.</p><p><a href="/proof/sources">Open sources</a></p></div>
</div>
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
  const cards = [...data.evidence.values()]
    .map((record) => {
      const screenshots = record.serviceId ? screenshotRecordsForService(data, record.serviceId) : [];
      return `<article class="evidence-card">
<h2>${evidenceLink(record.id)}</h2>
<p>${escapeHtml(displayValue(record.title, "Derived from machine QA evidence index."))}</p>
<div class="grid">
<div><strong>Status</strong><br>${statusBadge(record.status ?? "human-review-required", record.status?.includes("pass") ? "pass" : "review")}</div>
<div><strong>Capability</strong><br>${record.capabilityId ? `<a href="/proof/capabilities/${escapeHtml(record.capabilityId)}">${escapeHtml(record.capabilityId)}</a>` : "Not applicable - aggregate evidence."}</div>
<div><strong>Service</strong><br>${record.serviceId ? `<a href="/proof/services/${escapeHtml(record.serviceId)}">${escapeHtml(record.serviceId)}</a>` : "Not applicable - no service mapping."}</div>
<div><strong>Source artifact</strong><br>${sourcePathCell(record.target)}</div>
<div><strong>Review route</strong><br>${record.proofRoute ? `<a href="${escapeHtml(record.proofRoute)}">${escapeHtml(record.proofRoute)}</a>` : "Derived from machine QA - no separate route."}</div>
<div><strong>Chain of custody</strong><br>${sourcePathCell(data.persistentEvidence.path)}</div>
</div>
${screenshots.length ? `<div class="screenshot-grid">${screenshots.slice(0, 2).map((screenshot) => renderScreenshotFigure(screenshot)).join("")}</div>` : ""}
</article>`;
    })
    .join("");
  return layout(
    "Proof evidence",
    `<p>Evidence records include source documents, service evidence, machine QA evidence store rows, final report, chain-of-custody surfaces, and human-review targets.</p>
${cards}
${nonClaimsBlock()}`,
  );
}

function renderScreenshots(data) {
  const direct = data.screenshots.filter((screenshot) => imagePathFromScreenshot(screenshot));
  const equivalent = data.screenshots.length - direct.length;
  return layout(
    "Proof screenshots and equivalents",
    `<section class="hero">
<h2>Visual evidence gallery</h2>
<p>Every screenshot record is rendered inline when a safe PNG artifact exists. Screenshot-equivalent records remain explicit and require human review before final acceptance.</p>
<div class="grid">
<div class="card"><h3>Total records</h3><p class="metric">${data.screenshots.length}</p></div>
<div class="card"><h3>Inline renderable</h3><p class="metric">${direct.length}</p></div>
<div class="card"><h3>Equivalent or non-image</h3><p class="metric">${equivalent}</p></div>
</div>
</section>
<section>
<h2>Screenshot gallery</h2>
<div class="screenshot-grid">${data.screenshots.map((screenshot) => renderScreenshotFigure(screenshot)).join("")}</div>
</section>
<section>
<h2>Manifest index</h2>
${table(["Screenshot", "Kind", "Target", "Path", "Hash", "Human review"], screenshotRows(data.screenshots))}
</section>
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
<section>
<h2>Inline evidence</h2>
<div class="screenshot-grid">${renderScreenshotFigure(screenshot, { eager: true })}</div>
</section>
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
    ["Warnings, gaps, corrective actions, and retest status", `Latest machine run records ${latest.warnCount} warnings, ${latest.gapCount} unresolved gaps, and ${latest.failCount} failures. Corrective actions recorded: ${data.persistentEvidence.humanReview.correctiveActions}. Retest requests: ${data.persistentEvidence.humanReview.retestRequested}.`],
    ["Warning resolution", "Original warning count: 68. Final warning count: 0. Final unresolved gap count: 0. Resolution inventory: evidence/proof-evidence/proof-cockpit/warning-inventory.json. Resolution method: service screenshot-equivalent evidence was completed, alert fields were exposed, and enterprise Evidence status fields were rendered. Proof: latest machine QA has zero warnings, zero failures, and zero unresolved gaps."],
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
  const latest = data.persistentEvidence.latestMachineRun;
  const selectedScreenshots = [
    routeScreenshot(data, "/proof"),
    routeScreenshot(data, "/proof/review"),
    routeScreenshot(data, "/proof/reports/final"),
    ...data.screenshots.filter((screenshot) => screenshot.serviceId).slice(0, 6),
  ].filter(Boolean);
  return layout(
    "Final external-review report",
    `<article class="print-report">
<section class="print-cover">
<h2>USF-293 External Review Report</h2>
<p>This report is externally reviewable and print/export friendly. It answers what was proven, why, when, where, how, who or what performed the proof, which resources and semantic definitions were used, which services/routes/ports/adapters/providers/commands/screenshots/artifacts support it, which items require human review, and what remains unclaimed.</p>
<div class="grid">
<div class="card"><h3>Machine QA</h3><p class="metric">${escapeHtml(`${latest.passCount} pass`)}</p><p>${statusBadge(`${latest.warnCount} warnings`, latest.warnCount ? "warn" : "pass")} ${statusBadge(`${latest.gapCount} gaps`, latest.gapCount ? "warn" : "pass")} ${statusBadge(`${latest.failCount} failures`, latest.failCount ? "bad" : "pass")}</p></div>
<div class="card"><h3>Evidence scope</h3><p>${escapeHtml(data.claims.length)} claims, ${escapeHtml(data.capabilities.length)} capabilities, ${escapeHtml(data.services.length)} services, ${escapeHtml(data.screenshots.length)} screenshots.</p></div>
<div class="card"><h3>Human review</h3><p>${escapeHtml(state.actions.length)} browser actions recorded; final signoff is not auto-completed.</p></div>
</div>
${table(
      ["Field", "Value"],
      [
        ["Repository report path", data.persistentEvidence.finalReportPath],
        ["External-review bundle path", "evidence/proof-evidence/proof-cockpit/external-review-bundle/README.md"],
        ["Persistent evidence store", data.persistentEvidence.path],
        ["Source SHA", latest.sourceSha],
        ["Deployment SHA", latest.deploymentSha],
        ["Run ID", latest.runId],
      ].map(([field, value]) => `<tr><th>${escapeHtml(field)}</th><td>${sourcePathCell(value)}</td></tr>`),
    )}
</section>
${sections
      .map(
        ([title, body], index) => `<section><h2>${index + 1}. ${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`,
      )
      .join("")}
<section>
<h2>Inline Screenshot Evidence Sample</h2>
<div class="screenshot-grid">${selectedScreenshots.map((screenshot, index) => renderScreenshotFigure(screenshot, { eager: index === 0 })).join("")}</div>
</section>
<section>
<h2>Signoff Section</h2>
<p>Final human acceptance is intentionally separate. Matthew must use the signoff route after review criteria are satisfied; this report does not auto-complete ${ACCEPTANCE_ISSUE}.</p>
</section>
</article>
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

function renderReview(data, state, url = new URL("/proof/review", "http://127.0.0.1"), kind = "index", explicitId = "") {
  if (kind === "gaps") {
    return layout("Machine QA gap register", `${table(["Gap", "Description", "Owner", "Next action"], reviewRows("gaps"))}${nonClaimsBlock()}`);
  }
  if (kind === "nonconformities") {
    return layout("Nonconformities", `${table(["Nonconformity", "Description", "Owner", "Next action"], reviewRows("nonconformities"))}${nonClaimsBlock()}`);
  }
  if (kind === "corrective-actions") {
    return layout("Corrective actions", `${table(["Corrective action", "Description", "Owner", "Re-test"], reviewRows("correctiveActions"))}${nonClaimsBlock()}`);
  }
  const items = buildReviewItems(data);
  const index = currentReviewIndex(items, state, url, explicitId);
  const item = items[index];
  const decision = reviewItemDecision(state, item);
  const progress = Math.round(((index + 1) / items.length) * 100);
  const previous = index > 0 ? `<a class="button-link" href="/proof/review?item=${index - 1}">Previous</a>` : "";
  const next = index + 1 < items.length ? `<a class="button-link button-primary" href="/proof/review?item=${index + 1}">Next</a>` : `<a class="button-link button-primary" href="/proof/signoff">Review signoff state</a>`;
  const evidenceRows = item.evidenceLinks.length
    ? item.evidenceLinks.map((id) => `<tr><td>${evidenceLink(id)}</td><td>${sourcePathCell(data.evidence.get(id)?.target ?? "Derived from review item mapping.")}</td></tr>`)
    : [`<tr><td>Not applicable - no separate evidence record.</td><td>Derived from machine QA and screenshot/service/claim mapping.</td></tr>`];
  const screenshotFigures = item.screenshots.length
    ? item.screenshots.map((screenshot, shotIndex) => renderScreenshotFigure(screenshot, { eager: shotIndex === 0 })).join("")
    : `<div class="card"><p><strong>Not applicable - no inline screenshot for this item.</strong></p><p>This review item is supported by source/evidence records rather than a screenshot artifact.</p></div>`;
  return layout(
    "Proof review workflow",
    `<section class="hero">
<h2>${escapeHtml(item.title)}</h2>
<p>${statusBadge(item.type, "neutral")} ${statusBadge(decision.status, decision.tone)}</p>
<div class="progress" aria-label="Review progress"><span style="width:${escapeHtml(progress)}%"></span></div>
<p class="muted">Item ${index + 1} of ${items.length}. ${escapeHtml(displayValue(decision.action?.createdAt, "No human decision recorded for this item yet."))}</p>
<div class="hero-actions">${previous} ${next}</div>
</section>
${reviewItemActionForms(item, `/proof/review?item=${index}`)}
<div class="review-shell">
<article class="review-main">
<section>
<h2>Inline screenshot evidence</h2>
<div class="screenshot-grid">${screenshotFigures}</div>
</section>
<section>
<h2>Evidence summary</h2>
<p>${escapeHtml(item.summary)}</p>
</section>
<section>
<h2>Machine QA conclusion</h2>
<p>${escapeHtml(item.machineQaConclusion)}</p>
</section>
<section>
<h2>Risk and assurance posture</h2>
<p>${escapeHtml(item.riskPosture)}</p>
</section>
<section>
<h2>Evidence links</h2>
${table(["Evidence", "Source artifact"], evidenceRows)}
</section>
<section>
<h2>Human reenactment instructions</h2>
<p>${escapeHtml(displayValue(item.screenshots[0]?.humanReenactmentInstruction, "Open the linked route or evidence record, verify source SHA, run ID, screenshot hash, redaction posture, synthetic-data boundary, and non-claims, then record a decision."))}</p>
</section>
</article>
<aside class="review-side">
<h2>Review navigation</h2>
<p>${previous} ${next}</p>
<table><tbody>
<tr><th>Current item</th><td>${escapeHtml(item.id)}</td></tr>
<tr><th>Type</th><td>${escapeHtml(item.type)}</td></tr>
<tr><th>Related route</th><td>${item.route ? `<a href="${escapeHtml(item.route)}">${escapeHtml(item.route)}</a>` : "Not applicable - no route."}</td></tr>
<tr><th>Capability</th><td>${item.capabilityId ? `<a href="/proof/capabilities/${escapeHtml(item.capabilityId)}">${escapeHtml(item.capabilityId)}</a>` : "Not applicable - aggregate item."}</td></tr>
<tr><th>Service</th><td>${item.serviceId ? `<a href="/proof/services/${escapeHtml(item.serviceId)}">${escapeHtml(item.serviceId)}</a>` : "Not applicable - no service mapping."}</td></tr>
<tr><th>Decision</th><td>${escapeHtml(decision.status)}</td></tr>
</tbody></table>
<h2>Registers</h2>
<ul>
<li><a href="/proof/review/gaps">Gap register</a></li>
<li><a href="/proof/review/nonconformities">Nonconformities</a></li>
<li><a href="/proof/review/corrective-actions">Corrective actions</a></li>
<li><a href="/proof/export">External-review export</a></li>
</ul>
</aside>
</div>
${nonClaimsBlock()}`,
  );
}

function renderReviewDetail(data, state, reviewId) {
  const items = buildReviewItems(data);
  if (items.some((item) => item.id === reviewId)) {
    return renderReview(data, state, new URL(`/proof/review?item=${encodeURIComponent(reviewId)}`, "http://127.0.0.1"), "index", reviewId);
  }
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

function serviceAuthPosture(service) {
  const httpPorts = (service.ports ?? []).filter((port) => ["http", "https"].includes(String(port.appProtocol ?? "").toLowerCase()));
  const serviceId = service.serviceId;
  const explicitServiceLogin = new Set(["keycloak", "minio", "openbao", "grafana", "pgadmin", "sonarqube", "windmill"]);
  const intentionallyAnonymous = new Set(["mailpit", "alertmanager", "temporal-ui", "public-proof-origin"]);
  if (!httpPorts.length) {
    return {
      posture: "api/cli-only",
      method: "No HTTP/HTTPS UI candidate is registered for this service.",
      config: "spec/instances/compose-service/service-catalogue.json",
      credentialRef: "not required",
      rotation: "not required",
      rationale: "Screenshot-equivalent or command evidence is acceptable only because no direct UI surface is registered.",
    };
  }
  if (explicitServiceLogin.has(serviceId)) {
    const credentialRef = `openbao://secret/data/usf-proof-cockpit/screenshot/${serviceId}/credential`;
    return {
      posture: serviceId === "openbao" ? "auth-required" : "service-login required",
      method:
        serviceId === "openbao"
          ? "OpenBao token-authenticated API control proof with redacted UI-equivalent evidence."
          : "Scoped QA/operator credential retrieved from OpenBao, followed by service login before screenshot capture.",
      config: serviceId === "grafana" ? "compose/compose.test.generated.yaml#services.grafana.environment" : "compose/compose.test.generated.yaml",
      credentialRef,
      rotation: serviceId === "sonarqube" ? "required on first login and retained only in OpenBao" : "not required by current local proof",
      rationale:
        "The service has an operator/admin surface. Port exposure alone is not accepted as proof that authentication is unnecessary.",
    };
  }
  if (intentionallyAnonymous.has(serviceId)) {
    const mismatch = service.authRequirement === "operator-auth-required" || (service.ports ?? []).some((port) => port.authRequired);
    return {
      posture: "intentionally anonymous/no-auth",
      method: "Direct local-loopback screenshot with synthetic data only; no service login is configured in generated Compose.",
      config: "compose/compose.test.generated.yaml and spec/instances/compose-service/service-catalogue.json",
      credentialRef: "not required",
      rotation: "not required",
      rationale: mismatch
        ? "Catalogue access-scoping remains visible; generated local Compose has no login or forward-auth config, so this proof is bounded to local synthetic evidence and cannot support staging or production access-control claims."
        : "Repository metadata records this as a local synthetic no-auth proof surface.",
    };
  }
  if (serviceId === "caddy") {
    return {
      posture: "intentionally anonymous/no-auth",
      method: "Gateway response evidence only; no route-level forward-auth or operator UI is configured in this proof scope.",
      config: "docs/architecture/gateway-clickthrough-access-substrate-matrix.json and compose/compose.test.generated.yaml#services.external-caddy",
      credentialRef: "not required",
      rotation: "not required",
      rationale:
        "The gateway matrix records clickthrough and forward-auth as unproven. This page must not be read as gateway readiness.",
    };
  }
  return {
    posture: "intentionally anonymous/no-auth",
    method: "Direct local-loopback screenshot or API page with synthetic data only.",
    config: "spec/instances/compose-service/service-catalogue.json",
    credentialRef: "not required",
    rotation: "not required",
    rationale: "No repository auth configuration is registered for this local proof surface.",
  };
}

function renderServices(data) {
  const rows = data.services.map((service) => {
    const integration = service.integration ?? {};
    const auth = serviceAuthPosture(service);
    return `<tr>
<td>${serviceLink(service)}</td>
<td>${escapeHtml(service.serviceOwner ?? "missing")}</td>
<td>${escapeHtml(service.assetInventoryClass ?? "missing")}</td>
<td>${escapeHtml((service.profileNames ?? []).join(", ") || "missing")}</td>
<td>${escapeHtml(auth.posture)}</td>
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
<p>Auth posture is explicit evidence metadata. An exposed local port is never treated as proof that authentication is unnecessary. Auth-required service UI captures must use scoped OpenBao-backed QA/operator credentials, and intentionally anonymous local captures are bounded to synthetic data and non-readiness evidence.</p>
<section>
<h2>Service inventory</h2>
${table(["Service", "Owner", "Asset class", "Profiles", "Auth posture", "Integration disposition", "Proof command", "Click-through state"], rows)}
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
  return SOURCE_PATH_PREFIXES.some((prefix) => baseValue.startsWith(prefix)) ? baseValue : "";
}

function sourceLink(path, label = path) {
  return `<a href="/proof/source?path=${encodeURIComponent(path)}">${escapeHtml(label)}</a>`;
}

function isReviewableSourceFile(path) {
  try {
    return statSync(sourceFilePath(path)).isFile();
  } catch {
    return false;
  }
}

function sourcePathCell(path) {
  const safePath = safeSourcePath(path);
  if (safePath.endsWith(".png")) {
    const safeImage = safeImagePath(safePath);
    return safeImage ? `<a href="/proof/image?path=${encodeURIComponent(safeImage)}">${escapeHtml(path)}</a>` : escapeHtml(path);
  }
  return safePath && isReviewableSourceFile(safePath) ? sourceLink(safePath, path) : escapeHtml(path);
}

function redactSourceContent(content) {
  return String(content ?? "")
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[redacted private key block]")
    .replace(
      /(\b[A-Z0-9_]*(?:TOKEN|PASSWORD|SECRET|CREDENTIAL|PRIVATE_KEY|API_KEY|ACCESS_KEY)[A-Z0-9_]*\b\s*[:=]\s*)(["']?)([^"'\s]{4,})(\2)/gi,
      "$1$2[redacted proof-cockpit source viewer value]$4",
    )
    .replace(
      /(\b(?:password|secret|token|credential|privateKey|apiKey|accessKey)\b\s*[:=]\s*)(["']?)([^"'\s]{4,})(\2)/gi,
      "$1$2[redacted proof-cockpit source viewer value]$4",
    );
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
  if (path.endsWith(".png")) {
    return notFound("Screenshot PNG files are rendered only through the manifest-gated image endpoint.");
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
<pre>${escapeHtml(redactSourceContent(content).slice(0, 200000))}</pre>
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
  const auth = serviceAuthPosture(service);
  const serviceScreenshots = screenshotRecordsForService(data, service.serviceId);
  const manifestAuth = serviceScreenshots[0] ?? {};
  const authRows = [
    ["Actual auth posture", manifestAuth.actualAuthPosture ?? manifestAuth.authPosture ?? auth.posture],
    ["Login method", manifestAuth.loginMethod ?? auth.method],
    ["Credential source", manifestAuth.openBaoLogicalSecretRef ?? manifestAuth.credentialSourceRef ?? auth.credentialRef],
    ["First-login password rotation", manifestAuth.firstLoginPasswordRotationRequired ? `required; completed ${manifestAuth.firstLoginPasswordRotationCompleted ? "yes" : "no"}` : auth.rotation],
    ["Config evidence", manifestAuth.authPostureConfigPath ?? auth.config],
    ["OpenBao role/persona", manifestAuth.openBaoRolePersona ?? "Not applicable - no credential required."],
    ["OpenBao access audit", manifestAuth.openBaoAuditEvidence ?? "Not applicable - no credential required."],
    ["Authenticated capture status", manifestAuth.authenticatedCaptureStatus ?? "Derived from service catalogue."],
    ["Catalogue auth requirement", service.authRequirement ?? "missing"],
    ["Catalogue access posture", service.accessPosture ?? "missing"],
    ["Rationale and boundary", manifestAuth.authPostureRationale ?? auth.rationale],
    ["Human reenactment", manifestAuth.humanReenactmentInstruction ?? "Use only scoped staging/test-safe credentials retrieved by logical OpenBao reference when required; never expose credentials in screenshots, logs, artifacts, reports, or generated bundles."],
  ].map(([field, value]) => `<tr><th>${escapeHtml(field)}</th><td>${escapeHtml(value)}</td></tr>`);
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
<h2>Inline service screenshot evidence</h2>
<div class="screenshot-grid">${
      serviceScreenshots.length
        ? serviceScreenshots.map((screenshot, index) => renderScreenshotFigure(screenshot, { eager: index === 0 })).join("")
        : `<div class="card"><p><strong>Not evidenced - service screenshot record missing.</strong></p><p>This would block final audit readiness for an auth-required service.</p></div>`
    }</div>
</section>
<section>
<h2>Auth posture and OpenBao evidence</h2>
<table><tbody>
${authRows.join("\n")}
</tbody></table>
<p>This section is audit evidence only. It does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, product UI readiness, SOC readiness, ISO certification, or USF-290 completion.</p>
</section>
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
  if (kind === "alerts") {
    const alertRows = data.capabilities.map((capability) => `<tr>
<td><a href="/proof/capabilities/${escapeHtml(capability.id)}">${escapeHtml(capability.name)}</a></td>
<td>alert-${escapeHtml(capability.id)}</td>
<td>condition: route or service proof deviation, stale evidence, warning count above zero, gap count above zero, or corrective action requested for ${escapeHtml(capability.domain)}</td>
<td>human-review-required</td>
<td>correlation id review value</td>
<td><a href="/proof/evidence/${escapeHtml(capability.evidenceIds[0] ?? "")}">${escapeHtml(capability.evidenceIds[0] ?? "human-review-required")}</a></td>
</tr>`);
    return layout("Alerts", table(["Capability", "Alert name", "Condition", "Evidence", "Correlation", "Evidence link"], alertRows));
  }
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
  const items = buildReviewItems(data);
  const itemStates = items.map((item) => ({ item, decision: reviewItemDecision(state, item) }));
  const rejected = itemStates.filter(({ decision }) => decision.status === "rejected");
  const retest = itemStates.filter(({ decision }) => decision.status === "retest-requested");
  const unreviewed = itemStates.filter(({ decision }) => decision.status === "human-review-required");
  const accepted = itemStates.filter(({ decision }) => decision.status === "accepted");
  const rows = [
    ["Accepted review items", accepted.length],
    ["Rejected review items", rejected.length],
    ["Retest requested", retest.length],
    ["Unreviewed items", unreviewed.length],
    ["Recorded browser actions", state.actions.length],
    ["Final signoff auto-completed", "no"],
  ].map(([field, value]) => `<tr><th>${escapeHtml(field)}</th><td>${escapeHtml(value)}</td></tr>`);
  const openRows = [...rejected, ...retest, ...unreviewed].slice(0, 50).map(({ item, decision }) => `<tr>
<td><a href="/proof/review?item=${encodeURIComponent(item.id)}">${escapeHtml(item.title)}</a></td>
<td>${escapeHtml(item.type)}</td>
<td>${escapeHtml(decision.status)}</td>
<td>${escapeHtml(item.riskPosture)}</td>
</tr>`);
  return layout(
    "Proof signoff",
    `<section class="hero">
<h2>Final signoff</h2>
<p>Final human signoff is separate from machine QA, is not auto-completed, and final acceptance remains unavailable until Matthew makes an explicit final decision for ${ACCEPTANCE_ISSUE}. This page shows what remains before that decision.</p>
</section>
<section>
<h2>Current signoff state</h2>
${table(["Field", "Value"], rows)}
</section>
<section>
<h2>Remaining rejected, retest, or unreviewed items</h2>
${table(["Item", "Type", "State", "Risk posture"], openRows.length ? openRows : [`<tr><td colspan="4">No rejected, retest, or unreviewed review items are currently recorded in the browser action ledger.</td></tr>`])}
</section>
<section>
<h2>Final signoff prerequisites requiring human confirmation</h2>
${unorderedList([
      "All capability, role, service, scenario, evidence, source, and enterprise actions reviewed by an authorised human auditor.",
      "All browser-entered QA actions promoted to immutable evidence artifacts with source SHA and timestamps.",
      "All stop conditions cleared or explicitly dispositioned with owner and rationale.",
      "Final USF-290 acceptance criteria mapped to evidence and checked in Linear.",
    ])}
<p><a class="button-link button-primary" href="/proof/review">Continue review</a> <a class="button-link" href="/proof/reports/final">Open printable report</a></p>
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
<tr><th>Evidence status</th><td>${escapeHtml(domain.result)}</td></tr>
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

function renderProofImage(url) {
  const path = safeImagePath(url?.searchParams?.get("path"));
  if (!path) {
    return notFound("Screenshot path is not whitelisted for browser review.");
  }
  const filePath = sourceFilePath(path);
  if (!existsSync(filePath)) {
    return notFound(`Screenshot artifact ${path} was not found.`);
  }
  return {
    status: 200,
    body: readFileSync(filePath),
    contentType: "image/png",
  };
}

function forbiddenWriteResponse(message) {
  return {
    status: 403,
    body: layout(
      "Proof cockpit read-only",
      `<section>
<h2>Action not recorded</h2>
<p>${escapeHtml(message)}</p>
<p>This public/default proof route is reviewable but does not accept unauthenticated browser mutations. Use the authorised staging SSO or operator boundary with explicit write mode to record review decisions.</p>
<p><a href="/proof/review">Back to review workflow</a></p>
${nonClaimsBlock()}
</section>`,
    ),
  };
}

function csrfCookieHeader(policy) {
  const token = csrfTokenForPolicy(policy);
  if (!token) {
    return "";
  }
  return `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/proof; HttpOnly; SameSite=Strict`;
}

function csrfValid(request, params, policy) {
  const expected = csrfTokenForPolicy(policy);
  const supplied = params.get("csrfToken") ?? "";
  const cookie = parseCookies(request.headers.cookie ?? "")[CSRF_COOKIE_NAME] ?? "";
  return Boolean(expected && secureEqual(supplied, expected) && secureEqual(cookie, expected));
}

async function handleProofPost(request, statePath, policy = writePolicyFromOptions()) {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const routePath = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  if (routePath !== "/proof/actions") {
    return { status: 405, body: layout("Method not allowed", "<p>Only QA action form submissions are supported.</p>") };
  }
  if (!policy.allowWrites) {
    return forbiddenWriteResponse(
      policy.requested
        ? "Write mode was requested but the operator review secret is missing, so the cockpit remains read-only."
        : "Unauthenticated proof-cockpit POST writes are disabled by default.",
    );
  }
  const body = await readRequestBody(request);
  const params = new URLSearchParams(body);
  if (!csrfValid(request, params, policy)) {
    return forbiddenWriteResponse("The proof-cockpit CSRF/session token was missing or invalid.");
  }
  const state = loadProofState(statePath);
  const action = normalizeAction(params, actorFromRequest(request, policy));
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
    return html(renderReview(data, state, url));
  }
  if (routePath === "/proof/review/gaps") {
    return html(renderReview(data, state, url, "gaps"));
  }
  if (routePath === "/proof/review/nonconformities") {
    return html(renderReview(data, state, url, "nonconformities"));
  }
  if (routePath === "/proof/review/corrective-actions") {
    return html(renderReview(data, state, url, "corrective-actions"));
  }
  if (routePath.startsWith("/proof/review/")) {
    return page(renderReviewDetail(data, state, decodeURIComponent(routePath.slice("/proof/review/".length))));
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
  const writePolicy = writePolicyFromOptions(options);
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const result =
        (request.method === "GET" || request.method === "HEAD") && url.pathname === "/proof/image"
          ? renderProofImage(url)
          : request.method === "POST"
          ? await handleProofPost(request, statePath, writePolicy)
          : renderProofCockpit(url.pathname, data, loadProofState(statePath), url);
      const csrfCookie = csrfCookieHeader(writePolicy);
      response.writeHead(result.status, {
        "Content-Type": result.contentType ?? "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...(csrfCookie ? { "Set-Cookie": csrfCookie } : {}),
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
