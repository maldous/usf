import { createServer } from "node:http";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = new URL("../../..", import.meta.url).pathname;
const MATRIX_PATH = join(ROOT, "docs/architecture/capability-source-coverage-matrix.md");
const CONTRACT_DIR = join(ROOT, "spec/instances/semantic-contract");
const SERVICE_CATALOGUE_PATH = join(ROOT, "spec/instances/compose-service/service-catalogue.json");
const COMPOSED_SERVICE_MATRIX_PATH = join(ROOT, "docs/architecture/composed-service-integration-test-matrix.json");
const REACT_PARITY_IMPORT_SOURCE = "docs/architecture/proof-cockpit-react-non-ui-parity-import.json";
const REACT_PARITY_CLOSURE_SOURCE = "docs/architecture/react-non-ui-parity-test-closure-gate.json";
const REACT_PARITY_ASSURANCE_SOURCE = "docs/architecture/react-parity-assurance-case.json";
const REACT_PARITY_GAP_SOURCE = "docs/architecture/react-non-ui-parity-gap-register.json";
const REACT_PARITY_VALIDATOR_COMMAND = Object.freeze([
  "python3",
  "tools/validate-react-non-ui-parity/validate-react-non-ui-parity.py",
  "all",
  "--json",
]);
const LINEAR_ISSUE = "USF-290";
const DEFAULT_STATE_PATH = process.env.USF_PROOF_COCKPIT_STATE_PATH ?? "/tmp/usf-proof-cockpit-actions.json";

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
  "no-full-react-product-parity",
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
  "/proof/qa",
  "/proof/react-non-ui-parity",
  "/proof/actions",
  "/proof/actions/:actionId",
  "/proof/machine-runs",
  "/proof/machine-runs/:runId",
  "/proof/import",
  "/proof/import/:runId",
  "/proof/import/:runId/capabilities/:capabilityId",
  "/proof/review",
  "/proof/review/gaps",
  "/proof/review/nonconformities",
  "/proof/review/corrective-actions",
  "/proof/export",
  "/proof/capabilities",
  "/proof/capabilities/:capabilityId",
  "/proof/services",
  "/proof/services/:serviceId",
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
  ["/proof", "Cockpit landing page", "Confirm warnings, source SHA, environment metadata, and route map.", "source SHA, deployment metadata, visible non-claims"],
  ["/proof/qa", "Formal human QA workflow", "Follow the per-capability confirmation sequence and stop conditions before signoff.", "human action record, screenshot, correlation id, immutable artifact"],
  ["/proof/react-non-ui-parity", "USF-291 React non-UI parity closure evidence", "Review the merged Test-layer React non-UI parity closure before accepting staging QA evidence.", "external-review report, assurance case, chain-of-custody rows, validator result, PR merge SHA"],
  ["/proof/actions", "Recorded QA action ledger", "Review submitted browser QA actions, blockers, evidence links, and confirmation check states.", "file-backed local QA records; not immutable final evidence"],
  ["/proof/actions/:actionId", "QA action detail", "Review one submitted action and decide whether more evidence or correction is needed.", "operator-entered action fields, source SHA, timestamp"],
  ["/proof/machine-runs", "Machine QA run index", "Import the latest machine evidence bundle, compare it with prior runs, and inspect run status.", "qa-run manifest, report links, import status"],
  ["/proof/machine-runs/:runId", "Machine QA run detail", "Review machine coverage, evidence manifests, gaps, and chain of custody for a selected run.", "run metadata, manifests, screenshots, chain-of-custody"],
  ["/proof/import", "Machine evidence import", "Load a machine QA run for human review without automatic acceptance.", "human import manifest, diff placeholder, action ledger"],
  ["/proof/import/:runId", "Machine run import detail", "Accept, reject, annotate, defer, or request re-test for machine evidence.", "human import decision records"],
  ["/proof/import/:runId/capabilities/:capabilityId", "Capability evidence import", "Review per-capability machine evidence and record Matthew's human decision.", "capability evidence, screenshots, gaps, decision form"],
  ["/proof/review", "Human evidence review hub", "Triage machine gaps, nonconformities, corrective actions, stale evidence, and residual-risk decisions.", "gap register, nonconformity register, corrective action log"],
  ["/proof/review/gaps", "Gap register", "Review machine-found gaps and decide whether to fix, defer, accept risk, or re-test.", "typed gap records"],
  ["/proof/review/nonconformities", "Nonconformities", "Record evidence issues that prevent acceptance and require corrective action.", "nonconformity rows, owner, due date"],
  ["/proof/review/corrective-actions", "Corrective actions", "Track fixes, re-test commands, and validation evidence for rejected or failed machine evidence.", "corrective action rows"],
  ["/proof/export", "External-review export", "Prepare the portable evidence bundle for external reviewer consumption.", "README, executive summary, detailed report, manifests, screenshots"],
  ["/proof/capabilities", "All capability inventory", "Choose a capability, then open its service, scenario, evidence, audit, and observability links.", "75 capability rows, domain grouping, current prototype state"],
  ["/proof/capabilities/:capabilityId", "Capability detail", "Execute happy and negative path placeholders, verify services, and collect evidence.", "semantic contract, role, service, scenario, fixture, audit, alert, signoff placeholders"],
  ["/proof/services", "Compose service click-through inventory", "Open each required backing service page before a service-backed capability is accepted.", "service catalogue row, composed integration row, lifecycle command, proof command"],
  ["/proof/services/:serviceId", "Compose service detail", "Verify service health, seed/reset state, safe operation evidence, and operator boundary.", "catalogue ownership, profiles, fixture lifecycle, proof command, runbook gaps"],
  ["/proof/sources", "Evidence/source document index", "Open whitelisted source and evidence documents required by the proof ladder and enterprise audit.", "repository paths rendered read-only in browser"],
  ["/proof/source", "Evidence/source document viewer", "Review one whitelisted repository document without shell access.", "read-only repository file content"],
  ["/proof/scenarios/:scenarioId", "Scenario action page", "Perform the listed persona/tenant steps and capture expected result plus evidence links.", "scenario status, expected audit event, expected observability, expected alert"],
  ["/proof/roles", "Role and persona matrix", "Verify role-switch or role-login evidence without unsafe impersonation shortcuts.", "persona, role boundary, audit placeholder"],
  ["/proof/evidence/:evidenceId", "Evidence record page", "Attach or verify proof run, audit, observability, screenshot, PR, Linear, and runbook links.", "evidence id, status, target, source SHA"],
  ["/proof/audit", "Audit evidence matrix", "Confirm every capability has auditable event evidence before acceptance.", "audit event id, actor, tenant, action, correlation id"],
  ["/proof/observability", "Logs metrics traces matrix", "Confirm trace/log/metric evidence and correlation for each exercised path.", "correlation id, trace id, metric, log, dashboard/runbook"],
  ["/proof/fixtures", "Synthetic fixture lifecycle", "Verify seed, reset, cleanup, residual-state, and no-real-tenant-data posture.", "fixture id, lifecycle API, reset evidence"],
  ["/proof/alerts", "Alert coverage matrix", "Confirm expected alert or explicit no-alert rationale per capability/service.", "alert name, condition, route/service, evidence link"],
  ["/proof/signoff", "Disabled first-pass signoff", "Review missing evidence and disabled final acceptance controls.", "final signoff unavailable marker"],
  ["/proof/result", "Result decision placeholder", "Read the eventual decision target and current unavailable state.", "no final artifact in this pass"],
  ["/proof/enterprise", "Enterprise evidence index", "Open enterprise control-support pages and record missing evidence.", "ISMS-supporting evidence placeholders"],
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
  ["backup-dr", "Backup DR", "Backup, restore, disaster recovery, BCP, RTO/RPO-style placeholders, and restore evidence."],
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
  ["internal-audit", "Internal audit readiness", "Audit programme placeholder, evidence sampling, findings, independence boundary, and corrective action link."],
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
  "Select a capability and verify its semantic contract path, domain, role set, scenario links, and evidence placeholders.",
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
  "A route, service, or provider page claims staging, production, SOC, ISO, enterprise readiness, product UI readiness, browser E2E readiness, or full React parity.",
]);

const PROOF_LADDER_LEVELS = Object.freeze([
  [
    "Dev readiness prerequisite",
    "docs/architecture/dev-readiness-validation-and-handover.md",
    "Machine-completed dev evidence must be traced to the required human work: clone, setup, local verification, governed change, PR workflow, troubleshooting, safe config, and handover.",
    "repository-prerequisite-reference",
  ],
  [
    "Test readiness prerequisite",
    "docs/architecture/test-readiness-final-acceptance-gate.md",
    "Machine-completed test evidence must be traced to the required human work: composed backing service exercise, deterministic fixture lifecycle, role/security/data/service suites, validators, planted defects, and final acceptance gates.",
    "repository-prerequisite-reference",
  ],
  [
    "React non-UI parity closure prerequisite",
    "/proof/react-non-ui-parity",
    "Machine-completed USF-291 evidence must be reviewed so the auditor can confirm no React-derived non-UI foundation or operational-substrate item was silently omitted before staging QA.",
    "repository-prerequisite-reference",
  ],
  [
    "Staging QA exercise",
    "/proof/capabilities/:capabilityId",
    "Human auditor performs role-specific happy path, negative path, service click-through, audit, observability, alert, fixture, screenshot, and signoff actions.",
    "first-pass-placeholder",
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
    "React non-UI parity formal closure",
    "USF-291",
    "docs/architecture/proof-cockpit-react-non-ui-parity-import.json",
    "Confirm PR 243, merge SHA, external-review report, assurance case, chain-of-custody rows, validator pass, and preserved non-claims before staging QA relies on React-derived non-UI closure.",
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
  ["Proof cockpit React non-UI parity import", "docs/architecture/proof-cockpit-react-non-ui-parity-import.json"],
  ["Proof cockpit React non-UI parity import note", "docs/architecture/proof-cockpit-react-non-ui-parity-import.md"],
  ["React non-UI parity external-review report", "docs/architecture/react-non-ui-parity-external-review-report.md"],
  ["React non-UI parity closure gate", "docs/architecture/react-non-ui-parity-test-closure-gate.json"],
  ["React non-UI parity closure gate note", "docs/architecture/react-non-ui-parity-test-closure-gate.md"],
  ["React parity assurance case", "docs/architecture/react-parity-assurance-case.json"],
  ["React parity assurance case note", "docs/architecture/react-parity-assurance-case.md"],
  ["React non-UI baseline inventory", "docs/architecture/react-non-ui-baseline-inventory.json"],
  ["React service equivalence matrix", "docs/architecture/react-service-equivalence-matrix.json"],
  ["React route port adapter provider equivalence", "docs/architecture/react-route-port-adapter-provider-equivalence.json"],
  ["React test proof disposition ledger", "docs/architecture/react-test-proof-disposition-ledger.json"],
  ["React UI-derived foundation behaviour rewrite ledger", "docs/architecture/react-ui-derived-foundation-behaviour-rewrite-ledger.json"],
  ["React operator admin surface equivalence", "docs/architecture/react-operator-admin-surface-equivalence.json"],
  ["React non-UI parity gap register", "docs/architecture/react-non-ui-parity-gap-register.json"],
  ["Proof cockpit machine QA evidence model", "docs/architecture/proof-cockpit-machine-qa-evidence-model.json"],
  ["Proof cockpit machine QA evidence model note", "docs/architecture/proof-cockpit-machine-qa-evidence-model.md"],
  ["Capability source coverage matrix", "docs/architecture/capability-source-coverage-matrix.md"],
  ["Composed service integration matrix", "docs/architecture/composed-service-integration-test-matrix.json"],
  ["Service catalogue", "spec/instances/compose-service/service-catalogue.json"],
  ["Schema registry", "spec/registries/schema-registry.json"],
  ["Taxonomy catalogue", "spec/taxonomies/taxonomy-catalog.json"],
  ["Vocabulary catalogue", "spec/vocabularies/vocabulary-catalog.json"],
]);

const SOURCE_PATH_PREFIXES = Object.freeze([
  "docs/architecture/",
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

function loadReactParityClosureEvidence() {
  const importRecord = readJsonOrNull(sourceFilePath(REACT_PARITY_IMPORT_SOURCE)) ?? {};
  const closure = readJsonOrNull(sourceFilePath(REACT_PARITY_CLOSURE_SOURCE)) ?? {};
  const assurance = readJsonOrNull(sourceFilePath(REACT_PARITY_ASSURANCE_SOURCE)) ?? {};
  const gapRegister = readJsonOrNull(sourceFilePath(REACT_PARITY_GAP_SOURCE)) ?? {};
  return {
    importRecord,
    closure,
    assurance,
    gapRegister,
    importedSummary: importRecord.importedEvidenceSummary ?? closure.evidenceSummary ?? {},
    evidenceSources: importRecord.evidenceSources ?? [],
    nonClaims: importRecord.nonClaims ?? closure.nonClaims ?? [],
  };
}

function runReactParityValidatorCheck() {
  try {
    const output = execFileSync(REACT_PARITY_VALIDATOR_COMMAND[0], REACT_PARITY_VALIDATOR_COMMAND.slice(1), {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 20000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      status: "pass",
      command: REACT_PARITY_VALIDATOR_COMMAND.join(" "),
      detail: output.trim(),
    };
  } catch (error) {
    return {
      status: "local-check-unavailable-or-fail",
      command: REACT_PARITY_VALIDATOR_COMMAND.join(" "),
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
  const reactParity = loadReactParityClosureEvidence();
  const capabilities = parseMatrixCapabilities().map((capability) => {
    const contract = contracts.get(capability.semanticContractId);
    const serviceRefs = servicesForCapability(capability, serviceCatalogue.servicesById);
    const scenarioIds = [`${capability.id}-happy-path`, `${capability.id}-negative-path`];
    const evidenceIds = [`${capability.id}-semantic-contract`, `${capability.id}-runtime-evidence`];
    return {
      ...capability,
      contract,
      firstPassState: contract ? "prototype-listed" : "stubbed",
      scenarioIds,
      evidenceIds,
      signoffState: "not-available-first-pass",
      roles: rolesForDomain(capability.domain),
      serviceRefs,
      serviceNames: DOMAIN_SERVICES[capability.domain] ?? ["backing services not classified in first pass"],
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
      expectedResult: "First-pass placeholder for the successful staging exercise path.",
    });
    scenarios.set(capability.scenarioIds[1], {
      id: capability.scenarioIds[1],
      capabilityId: capability.id,
      name: `${capability.name} negative path`,
      pathType: "negative path",
      role: "anonymous visitor denial persona",
      expectedResult: "First-pass placeholder for denied, invalid, tenant mismatch, degraded, or timeout behaviour.",
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
      title: "Runtime staging evidence placeholder",
      status: "missing-first-pass-placeholder",
      target: "runtime route/API, audit, logs, metrics, traces, alerts, screenshots, and immutable artifact are not wired in this first pass",
    });
  }
  evidence.set("usf-291-react-non-ui-parity-closure", {
    id: "usf-291-react-non-ui-parity-closure",
    capabilityId: "aggregate-react-non-ui-parity",
    title: "USF-291 React non-UI parity closure evidence",
    status: reactParity.importRecord?.validatorEvidence?.allResult === "pass" ? "merged-validator-pass" : "available-repository-link",
    target: REACT_PARITY_IMPORT_SOURCE,
    proofRoute: "/proof/react-non-ui-parity",
  });
  return { capabilities, contracts, scenarios, evidence, reactParity, ...serviceCatalogue };
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
</head>
<body>
<header>
<h1>${escapeHtml(title)}</h1>
<nav>
<a href="/proof">Home</a> |
<a href="/proof/qa">QA</a> |
<a href="/proof/react-non-ui-parity">React non-UI parity</a> |
<a href="/proof/actions">Actions</a> |
<a href="/proof/capabilities">Capabilities</a> |
<a href="/proof/services">Services</a> |
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
<p>This proof cockpit does not claim Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, real-user product UI readiness, browser E2E readiness, full React product parity, or USF-290 completion.</p>
</footer>
</body>
</html>
`;
}

function warningsBlock() {
  return `<section>
<h2>Warnings</h2>
<ul>
<li>This is a first-pass staging proof cockpit prototype for review and feedback.</li>
<li>It is not final acceptance and it does not complete ${LINEAR_ISSUE}.</li>
<li>SSO enforcement is not wired in this local first-pass route. Staging exposure must put this route behind the authorised staging SSO boundary before any real use.</li>
<li>Runtime staging evidence, audit links, observability links, alerts, screenshots, role switching, and immutable artifacts are placeholders unless explicitly shown as repository links.</li>
<li>USF-289 is complete in live Linear, but this cockpit still treats live origin and deployment metadata as informational warnings until final USF-290 proofing wires them.</li>
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
${checkboxInput("nonClaimsConfirmed", "This action makes no staging, production, SOC, ISO, enterprise-readiness, product UI, browser E2E, or full React parity claim.")}
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
    `profiles: ${(service.profileNames ?? []).join(", ") || "missing-first-pass"}`,
    `claim: ${integration.testReadinessClaimAllowed ?? "unknown"}`,
    `state: ${service.firstPassClickThroughState}`,
  ].join(" - ");
}

function capabilityQaEvidenceRows(capability) {
  const rows = [
    ["Semantic contract", capability.contract?.path ?? capability.semanticTarget, capability.contract ? "repository-link" : "missing"],
    ["Route or API", capability.evidenceSummary, "needs-runtime-wiring"],
    ["Service click-through", `${capability.serviceRefs.length} linked service rows`, capability.serviceRefs.length ? "catalogue-linked" : "missing-first-pass"],
    ["Happy path", capability.scenarioIds[0], "first-pass placeholder"],
    ["Negative path", capability.scenarioIds[1], "first-pass placeholder"],
    ["Audit", "actor, tenant, action, result, timestamp, correlation id", "missing-first-pass"],
    ["Observability", "trace id, log, metric, dashboard or runbook link", "missing-first-pass"],
    ["Alert", "alert name, condition, route/service, evidence link", "missing-first-pass"],
    ["Fixture lifecycle", "seed, reset, cleanup, teardown, residual-state evidence", "missing-first-pass"],
    ["Screenshot or artifact", "immutable artifact link and source SHA", "missing-first-pass"],
    ["Human signoff", "Matthew confirmation after final proofing", "disabled-first-pass"],
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
<td>missing-first-pass-placeholder</td>
</tr>`,
  );
}

function isoSupportRows(topicId) {
  return ISO_SUPPORT_FIELDS.map(
    (field) =>
      `<tr>
<td>${escapeHtml(field)}</td>
<td>${escapeHtml(topicId)}</td>
<td>missing-first-pass-placeholder</td>
<td>required before formal enterprise evidence acceptance</td>
</tr>`,
  );
}

function stagingProofUiRows() {
  return STAGING_PROOF_UI_REQUIREMENTS.map(
    ([area, fields, route]) =>
      `<tr><td>${escapeHtml(area)}</td><td>${escapeHtml(fields)}</td><td>${routeToLink(route)}</td><td>partially-wired-current-iteration</td></tr>`,
  );
}

function roleChecklistRows(capability) {
  return capability.roles.map((role) => `<tr>
<td>${escapeHtml(role)}</td>
<td>Perform role-appropriate happy path for ${escapeHtml(capability.name)} with synthetic tenant context.</td>
<td>Perform denial, escalation, tenant mismatch, invalid input, or read-only check appropriate to ${escapeHtml(role)}.</td>
<td>Capture actor role, tenant, action, result, audit id, correlation id, trace id, service state, and screenshot artifact.</td>
<td><label><input type="checkbox" disabled> ${escapeHtml(role)} QA not performed in first pass</label></td>
</tr>`);
}

function routeSummaryRows() {
  return ROUTE_SUMMARIES.map(
    ([route, delivers, humanAction, evidence]) =>
      `<tr><td>${routeToLink(route)}</td><td>${escapeHtml(delivers)}</td><td>${escapeHtml(humanAction)}</td><td>${escapeHtml(evidence)}</td></tr>`,
  );
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
  const metadata = [
    `<tr><th>Source SHA</th><td>${escapeHtml(getSourceSha())}</td></tr>`,
    `<tr><th>Environment</th><td>${escapeHtml(process.env.USF_PROOF_ENVIRONMENT ?? "local-first-pass")}</td></tr>`,
    `<tr><th>Deployment</th><td>${escapeHtml(process.env.USF_DEPLOYMENT_ID ?? "unavailable-first-pass")}</td></tr>`,
    `<tr><th>Capability rows</th><td>${data.capabilities.length}</td></tr>`,
    `<tr><th>Recorded QA actions</th><td>${state.actions.length}</td></tr>`,
  ].join("");
  return layout(
    "USF staging proof cockpit",
    `<p>This plain HTML cockpit is a first-pass review surface for ${LINEAR_ISSUE}. It is intended to show what will land, gather corrections, and make missing evidence visible.</p>
${warningsBlock()}
<section>
<h2>Current metadata</h2>
<table><tbody>${metadata}</tbody></table>
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
<p>These controls are intentionally disabled in this iteration.</p>
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
  const importedState = action ? "ledger-action-found" : "generated-run-placeholder";
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
<h2>Available run placeholder</h2>
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
      `<tr><td>${escapeHtml(capability.id)}</td><td>capabilityEvidence</td><td>machine-generated or placeholder</td><td>accept, reject, annotate, defer, or request re-test</td></tr>`,
      `<tr><td>${escapeHtml(capability.scenarioIds[0])}</td><td>scenarioEvidence</td><td>machine-generated or placeholder</td><td>verify steps, role, tenant, audit, observability, alert, fixture, screenshot</td></tr>`,
      `<tr><td>${escapeHtml(capability.scenarioIds[1])}</td><td>negativeProof</td><td>machine-generated or placeholder</td><td>verify denial or failure path evidence</td></tr>`,
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

function reactParitySummaryRows(summary = {}) {
  return Object.entries(summary).map(
    ([key, value]) => `<tr><td>${escapeHtml(titleCase(key))}</td><td>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</td></tr>`,
  );
}

function reactParitySourceRows(evidenceSources = []) {
  return evidenceSources.map(
    (source) =>
      `<tr><td>${escapeHtml(source.title ?? source.id)}</td><td>${sourcePathCell(source.path)}</td><td>${escapeHtml(source.id ?? "")}</td></tr>`,
  );
}

function reactParityClaimRows(assurance = {}) {
  return (assurance.claims ?? []).map(
    (claim) => `<tr>
<td>${escapeHtml(claim.id)}</td>
<td>${escapeHtml(claim.claimText)}</td>
<td>${escapeHtml(claim.humanDecisionStatus ?? "not-recorded")}</td>
<td>${escapeHtml(claim.limitations ?? "")}</td>
</tr>`,
  );
}

function reactParityChainRows(assurance = {}) {
  return (assurance.chainOfCustody ?? []).map(
    (chain) => `<tr>
<td>${escapeHtml(chain.id)}</td>
<td>${escapeHtml(chain.claimId)}</td>
<td>${escapeHtml(chain.testCommand)}</td>
<td>${sourcePathCell(chain.artifactPath)}</td>
<td>${escapeHtml(chain.artifactHash)}</td>
<td>${escapeHtml(chain.sourceGitSha)}</td>
<td>${escapeHtml(chain.humanDecisionStatus ?? "see assurance claim")}</td>
</tr>`,
  );
}

function renderReactNonUiParity(data, state) {
  const evidence = data.reactParity ?? loadReactParityClosureEvidence();
  const importRecord = evidence.importRecord ?? {};
  const closure = evidence.closure ?? {};
  const assurance = evidence.assurance ?? {};
  const gapSummary = evidence.gapRegister?.summary ?? {};
  const importedValidator = importRecord.validatorEvidence ?? {};
  const liveValidator = runReactParityValidatorCheck();
  const recordedActions = recordedActionCountFor(
    state,
    (action) =>
      action.sourceUrl === REACT_PARITY_IMPORT_SOURCE ||
      action.evidenceId === "usf-291-react-non-ui-parity-closure" ||
      action.actionName?.includes("React non-UI parity"),
  );
  return layout(
    "USF-291 React non-UI parity closure evidence",
    `<p>This page imports merged USF-291 evidence into the USF-290 staging proof cockpit so the auditor can verify prior Test-layer closure before staging capability QA. It does not complete USF-290 and it does not claim React UI parity.</p>
<table><tbody>
<tr><th>Imported issue</th><td>USF-291</td></tr>
<tr><th>Source PR</th><td><a href="${escapeHtml(importRecord.sourcePullRequest?.url ?? "https://github.com/maldous/usf/pull/243")}">PR ${escapeHtml(importRecord.sourcePullRequest?.number ?? "243")}</a></td></tr>
<tr><th>Merge SHA</th><td>${escapeHtml(importRecord.sourcePullRequest?.mergeSha ?? "ec37409ddd779661569f8e5f8e4c835695efea96")}</td></tr>
<tr><th>Bounded claim imported for review</th><td>${escapeHtml(importRecord.boundedClaimImportedForReview ?? closure.boundedClaim ?? "missing")}</td></tr>
<tr><th>Closure decision</th><td>${escapeHtml(closure.closureDecision ?? "missing")}</td></tr>
<tr><th>Open gap count</th><td>${escapeHtml(gapSummary.openGapCount ?? evidence.importedSummary?.openGapCount ?? "missing")}</td></tr>
<tr><th>Recorded QA reviews</th><td>${recordedActions}</td></tr>
</tbody></table>
<section>
<h2>Validator result</h2>
<table><tbody>
<tr><th>Merged validator command</th><td>${escapeHtml(importedValidator.allCommand ?? REACT_PARITY_VALIDATOR_COMMAND.join(" "))}</td></tr>
<tr><th>Merged validator result</th><td>${escapeHtml(importedValidator.allResult ?? "missing")}</td></tr>
<tr><th>Merged selftest command</th><td>${escapeHtml(importedValidator.selftestCommand ?? "missing")}</td></tr>
<tr><th>Merged selftest result</th><td>${escapeHtml(importedValidator.selftestResult ?? "missing")}</td></tr>
<tr><th>Local live-check status</th><td>${escapeHtml(liveValidator.status)}</td></tr>
<tr><th>Local live-check command</th><td>${escapeHtml(liveValidator.command)}</td></tr>
</tbody></table>
<p>${escapeHtml(importedValidator.liveCheckNote ?? "Local live checks are diagnostic only for this cockpit page.")}</p>
<pre>${escapeHtml(liveValidator.detail)}</pre>
</section>
<section>
<h2>Evidence summary</h2>
${table(["Metric", "Value"], reactParitySummaryRows(evidence.importedSummary))}
</section>
<section>
<h2>External-review and source evidence</h2>
${table(["Evidence", "Read-only source link", "Evidence id"], reactParitySourceRows(evidence.evidenceSources))}
</section>
<section>
<h2>Assurance claims</h2>
${table(["Claim id", "Claim", "Human decision status", "Limitations"], reactParityClaimRows(assurance))}
</section>
<section>
<h2>Chain of custody</h2>
${table(["Chain id", "Claim id", "Validator or proof command", "Artifact", "Artifact hash", "Source SHA", "Human decision"], reactParityChainRows(assurance))}
</section>
<section>
<h2>Record React non-UI parity evidence review</h2>
${actionForm({
      actionType: "evidence-review",
      evidenceId: "usf-291-react-non-ui-parity-closure",
      sourceUrl: REACT_PARITY_IMPORT_SOURCE,
      evidenceUrl: "/proof/react-non-ui-parity",
      actionName: "review USF-291 React non-UI parity closure evidence",
      returnTo: "/proof/react-non-ui-parity",
    })}
</section>
${nonClaimsBlock()}
<section>
<h2>Preserved USF-291 non-claims</h2>
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
    ["React non-UI parity evidence", "USF-291 external-review report, assurance case, chain-of-custody rows, validator result, and merge SHA", "/proof/react-non-ui-parity"],
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
    `<p>This page is the first-pass human confirmation workflow for staging proof preparation. It describes what the auditor must do; it does not mark anything accepted.</p>
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
<h2>Current first-pass scope</h2>
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
    `<p>Capability rows are parsed from docs/architecture/capability-source-coverage-matrix.md. First-pass states are not acceptance states.</p>
<section><h2>Domain grouping</h2><ul>${grouped}</ul></section>
${table(["Capability", "Domain", "Semantic target", "First-pass state", "Scenario count", "Evidence count", "Signoff state"], rows)}`,
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
<td>${escapeHtml(integration.proofCommand ?? "missing-first-pass")}</td>
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
    `<p>Service rows come from the repository service catalogue and composed integration matrix. These links are the first-pass click-through surface for service-backed proof validation.</p>
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
  if (!value || value.startsWith("/") || value.includes("..") || /(^|\/)\./.test(value)) {
    return "";
  }
  if (/secret|token|credential|private|\.pem|\.key|\.env/i.test(value)) {
    return "";
  }
  return SOURCE_PATH_PREFIXES.some((prefix) => value.startsWith(prefix)) ? value : "";
}

function sourceLink(path, label = path) {
  return `<a href="/proof/source?path=${encodeURIComponent(path)}">${escapeHtml(label)}</a>`;
}

function sourcePathCell(path) {
  return safeSourcePath(path) ? sourceLink(path) : escapeHtml(path);
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
    ["Health/readiness", "Open authorised service health or readiness surface; record status and timestamp.", "missing-runtime-link-first-pass"],
    ["Fixture seed", `Confirm seeder ${lifecycle.seederId ?? "missing"} and fixture ${integration.fixtureSeedId ?? "missing"}.`, "missing-runtime-link-first-pass"],
    ["Safe operation", integration.safeOperationEvidence ?? "Perform one non-destructive operation and record result.", "missing-runtime-link-first-pass"],
    ["Negative/degraded path", "Exercise unavailable, denied, invalid, or timeout path where the service contract requires it.", "missing-first-pass"],
    ["Audit", service.auditRequirement ?? service.auditPosture ?? "Record audit event evidence.", "missing-first-pass"],
    ["Observability", "Capture log, metric, trace, and dashboard/runbook link.", "missing-first-pass"],
    ["Reset/cleanup", `Confirm resetter ${lifecycle.resetterId ?? "missing"} and cleanup ${lifecycle.cleanupId ?? "missing"}.`, "missing-first-pass"],
    ["Teardown", `Confirm teardown ${lifecycle.teardownId ?? "missing"}.`, "missing-first-pass"],
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
<tr><th>Proof command</th><td>${escapeHtml(integration.proofCommand ?? "missing-first-pass")}</td></tr>
<tr><th>Proof script</th><td>${escapeHtml(integration.proofScript ?? "missing-first-pass")}</td></tr>
<tr><th>Test suite</th><td>${escapeHtml(integration.testSuitePath ?? "missing-first-pass")}</td></tr>
<tr><th>Runtime click-through URL</th><td>missing-first-pass; final cockpit must link only to authorised staging service surfaces or runbooks</td></tr>
<tr><th>Recorded QA actions</th><td>${recordedActions}</td></tr>
</tbody></table>
<section>
<h2>Human service click-through checklist</h2>
${table(["Area", "Required human action", "First-pass status"], qaRows)}
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
${unorderedList(evidenceTests.length ? evidenceTests : ["missing-first-pass"])}
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
    "route/API references placeholder visible",
    "required roles visible",
    "required backend services visible",
    "happy path scenario placeholder visible",
    "negative path scenario placeholder visible",
    "audit evidence placeholder visible",
    "logs metrics traces placeholder visible",
    "alert evidence placeholder visible",
    "screenshot evidence placeholder visible",
    "synthetic data/reset placeholder visible",
    "manual signoff checkbox placeholder visible",
    "immutable artifact placeholder visible",
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
<td>${escapeHtml(integration.proofCommand ?? "missing-first-pass")}</td>
<td>${escapeHtml(integration.fixtureSeedId ?? "missing-first-pass")}</td>
<td>${escapeHtml(service.firstPassClickThroughState)}</td>
</tr>`;
      })
    : [`<tr><td colspan="5">No repository service catalogue rows mapped in this first pass.</td></tr>`];
  const recordedActions = recordedActionCountFor(state, (action) => action.capabilityId === capability.id);
  return layout(
    capability.name,
    `<p><a href="/proof/capabilities">Back to capabilities</a></p>
<table><tbody>
<tr><th>Capability id</th><td>${escapeHtml(capability.id)}</td></tr>
<tr><th>Domain</th><td>${escapeHtml(capability.domain)}</td></tr>
<tr><th>Slice</th><td>${escapeHtml(capability.slice)}</td></tr>
<tr><th>Semantic target</th><td>${escapeHtml(capability.semanticTarget)}</td></tr>
<tr><th>Semantic contract path</th><td>${capability.contract ? sourcePathCell(capability.contract.path) : "missing-first-pass"}</td></tr>
<tr><th>First-pass state</th><td>${escapeHtml(capability.firstPassState)}</td></tr>
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
<section><h2>Role-specific QA checklist placeholders</h2>
${table(["Role", "Happy path action", "Negative or permission action", "Evidence required", "First-pass state"], roleChecklistRows(capability))}
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
      .map((id) => `<li><a href="/proof/scenarios/${escapeHtml(id)}">${escapeHtml(id)}</a> - first-pass placeholder</li>`)
      .join("")}</ul></section>
<section><h2>Evidence</h2><ul>${capability.evidenceIds
      .map((id) => `<li><a href="/proof/evidence/${escapeHtml(id)}">${escapeHtml(id)}</a></li>`)
      .join("")}</ul></section>
<section><h2>Formal evidence required before acceptance</h2>
${table(["Artifact", "Required content", "Current state"], capabilityQaEvidenceRows(capability))}
</section>
<section><h2>Capability surface inventory placeholders</h2><ul>${surfaceChecklist
      .map((item) => `<li><label><input type="checkbox" disabled> ${escapeHtml(item)}</label></li>`)
      .join("")}</ul></section>
<section><h2>Manual signoff</h2><p><label><input type="checkbox" disabled> Matthew final acceptance unavailable in first pass</label></p></section>
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
<tr><th>Status</th><td>first-pass placeholder</td></tr>
<tr><th>Capability</th><td>${escapeHtml(capability?.name ?? scenario.capabilityId)}</td></tr>
<tr><th>Persona</th><td>${escapeHtml(scenario.role)}</td></tr>
<tr><th>Tenant</th><td>synthetic tenant placeholder</td></tr>
<tr><th>Expected result</th><td>${escapeHtml(scenario.expectedResult)}</td></tr>
<tr><th>Expected audit event</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Expected observability</th><td>missing correlation id, trace id, log, metric, and alert links in first pass</td></tr>
<tr><th>Evidence links</th><td>generated placeholders only</td></tr>
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
      ["Field", "Required value", "First-pass state"],
      [
        ["Actor and role", scenario.role, "placeholder"],
        ["Tenant", "synthetic tenant id", "placeholder"],
        ["Correlation id", "proof run correlation id", "missing-first-pass"],
        ["Trace id", "distributed trace id or equivalent", "missing-first-pass"],
        ["Audit event", "event id and immutable link", "missing-first-pass"],
        ["Service state", "linked service proof state", "missing-first-pass"],
        ["Screenshot/artifact", "immutable artifact link", "missing-first-pass"],
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
<td>first-pass placeholder</td>
<td>role-switch control not implemented; final proof must use authorised role login or safe role boundary</td>
<td>audit placeholder must record actor role, tenant, action, result, and correlation id before final proof</td>
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
<tr><th>Proof cockpit route</th><td>${record.proofRoute ? `<a href="${escapeHtml(record.proofRoute)}">${escapeHtml(record.proofRoute)}</a>` : "missing-first-pass-placeholder"}</td></tr>
<tr><th>Route/API proof</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Human QA action record</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Service click-through evidence</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Audit event</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Logs metrics traces</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Alert</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Screenshot</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Role used for QA</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Dev readiness prerequisite evidence</th><td>docs/architecture/dev-readiness-validation-and-handover.md</td></tr>
<tr><th>Test readiness prerequisite evidence</th><td>docs/architecture/test-readiness-final-acceptance-gate.md</td></tr>
<tr><th>Proof run</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Git SHA</th><td>${escapeHtml(getSourceSha())}</td></tr>
<tr><th>PR</th><td>pending draft PR</td></tr>
<tr><th>Linear issue</th><td>${LINEAR_ISSUE}</td></tr>
<tr><th>Runbook</th><td>missing-first-pass-placeholder</td></tr>
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
<td>missing-first-pass-placeholder</td>
<td>needs-runtime-wiring</td>
<td>correlation id placeholder</td>
</tr>`);
  return layout(titleCase(kind), table(["Capability", "Domain", "Evidence", "Status", "Correlation"], rows));
}

function renderFixtures(data) {
  const domainRows = [...new Set(data.capabilities.map((capability) => capability.domain))]
    .sort()
    .map((domain) => `<tr>
<td>${escapeHtml(domain)}</td>
<td>synthetic-${escapeHtml(domain)}-first-pass</td>
<td>version unavailable</td>
<td>last reset unavailable</td>
<td>residual state unknown</td>
<td>no real tenant data required by final posture; first-pass placeholder only</td>
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
<h2>Domain fixture placeholders</h2>
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
    `<p>Prototype controls are disabled. Final signoff remains unavailable until final USF-290 proofing is implemented.</p>
<p>Recorded QA actions: ${state.actions.length}. These are reviewable working records, not immutable final evidence.</p>
${table(["Capability", "State", "Recorded QA actions", "Signoff"], rows)}
<section>
<h2>Final signoff prerequisites not implemented in this iteration</h2>
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
    `<p>Current result: first-pass prototype only.</p>
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
<td>${escapeHtml(integration.proofCommand ?? "missing-first-pass")}</td>
<td>${escapeHtml(integration.safeOperationEvidence ?? "missing-first-pass")}</td>
<td>${escapeHtml(service.firstPassClickThroughState)}</td>
</tr>`;
  });
  return layout(
    "Proof auditor runbook",
    `<p>This runbook is the first-pass route and evidence checklist for a formal staging proof audit. It is intentionally explicit about missing evidence and disabled acceptance.</p>
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
<p>${ROUTES.length} route patterns are described. ${data.capabilities.length} capabilities and ${data.services.length} service catalogue rows are visible. Final evidence collection, role execution, and signoff remain unavailable in this first pass.</p>
</section>
${nonClaimsBlock()}`,
  );
}

function renderEnterpriseIndex() {
  return layout(
    "Enterprise evidence",
    `<p>First-pass enterprise pages expose expected evidence surfaces and missing evidence. They do not claim ISO certification, SOC readiness, enterprise readiness, or production readiness.</p>
<section>
<h2>Enterprise staging proof requirements</h2>
<p>These are the enterprise and ISO/IEC 27001-supporting evidence areas that a formal staging proof auditor must verify. They support an ISMS evidence foundation only; they are not certification evidence by themselves.</p>
${table(["Requirement", "Required evidence", "Cockpit route", "First-pass state"], enterpriseRequirementRows())}
</section>
<section>
<h2>ISO-supporting evidence fields</h2>
${unorderedList(ISO_SUPPORT_FIELDS)}
</section>
<section>
<h2>Enterprise topic pages</h2>
${table(
      ["Topic", "Purpose", "First-pass state"],
      ENTERPRISE_TOPICS.map(
        ([slug, title, purpose]) =>
          `<tr><td><a href="/proof/enterprise/${escapeHtml(slug)}">${escapeHtml(title)}</a></td><td>${escapeHtml(purpose)}</td><td>stubbed</td></tr>`,
      ),
    )}
</section>`,
  );
}

function renderEnterpriseTopic(state, slug) {
  const topic = ENTERPRISE_TOPICS.find(([candidate]) => candidate === slug);
  if (!topic) {
    return notFound(`Enterprise topic ${slug} was not found.`);
  }
  const [id, title, purpose] = topic;
  const recordedActions = recordedActionCountFor(state, (action) => action.enterpriseTopic === id);
  return layout(
    title,
    `<p><a href="/proof/enterprise">Back to enterprise index</a></p>
<table><tbody>
<tr><th>Topic id</th><td>${escapeHtml(id)}</td></tr>
<tr><th>Purpose</th><td>${escapeHtml(purpose)}</td></tr>
<tr><th>Evidence status</th><td>missing-first-pass-placeholder</td></tr>
<tr><th>Evidence owner</th><td>to be assigned during final proofing</td></tr>
<tr><th>Control owner</th><td>to be assigned during final proofing</td></tr>
<tr><th>Validation</th><td>not implemented in first pass</td></tr>
<tr><th>Non-claim</th><td>ISO certification, SOC readiness, enterprise production readiness, and staging readiness are not claimed.</td></tr>
<tr><th>Recorded QA actions</th><td>${recordedActions}</td></tr>
</tbody></table>
<section>
<h2>Record enterprise evidence review</h2>
${actionForm({
      actionType: "enterprise-evidence-review",
      enterpriseTopic: id,
      actionName: `review enterprise topic ${title}`,
      sourceUrl: `/proof/enterprise/${id}`,
      returnTo: `/proof/enterprise/${id}`,
    })}
</section>
<section>
<h2>Formal staging proof checks</h2>
${table(["Field", "Topic", "Current evidence", "Auditor requirement"], isoSupportRows(id))}
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
  if (routePath === "/proof/qa") {
    return html(renderQa(data, state));
  }
  if (routePath === "/proof/react-non-ui-parity") {
    return html(renderReactNonUiParity(data, state));
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
  if (routePath === "/proof/export") {
    return html(renderExport());
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
    return html(renderEnterpriseIndex());
  }
  if (routePath.startsWith("/proof/enterprise/")) {
    return page(renderEnterpriseTopic(state, decodeURIComponent(routePath.slice("/proof/enterprise/".length))));
  }
  return notFound(`Route ${pathname} is not part of the first-pass proof cockpit.`);
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
