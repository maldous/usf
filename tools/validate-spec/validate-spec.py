#!/usr/bin/env python3
"""USF spec validator (fail-closed).

Custom validator for the USF spec corpus. JSON Schema Draft 2020-12 defines artefact
*shape*; this tool *enforces* the cross-file rules a meta-schema cannot: registry sync,
enum-vs-vocabulary fidelity (explicit bindings, not guessing), taxonomy/vocabulary/ontology
reference resolution, lifecycle/file-existence, hollow-value rejection, broken $ref, closure,
and the proof/provider/environment/secret/report safety invariants. It is adversarial against
its own failure modes: `selftest` plants defects and asserts the exact rule id fires.

Status: formal USF validator, authored under explicit directive (pulls the validator-
implementation step forward; schema-authoring-standard section 24, standards-profile section
23 deferral lifted by directive). It writes no runtime files; --report emits a validator-report
instance only when asked, validated against validator-report.schema.json before write.

Exit codes:  0 = clean   1 = validation findings   2 = tool/internal error (incl. unreadable input).
Dependency:  jsonschema (Draft 2020-12). Pinned for CI in tools/validate-spec/requirements.txt.

Usage:
    python tools/validate-spec/validate-spec.py [MODE] [options]

Modes (default: all):
    schemas      meta-schema, identity, shape, closure, required, hollow, $ref
    enums        enum-vs-vocabulary fidelity via explicit bindings (+ forbidden + backstop)
    catalogues   validate the 3 catalogue instances + catalogue data integrity
    registry     repository inventory (bijection) + registry synchronisation
    fixtures     tools/validate-spec/fixtures positive/negative corpus + expected-reason manifest
    instances    committed semantic corpus instances under spec/instances
    imports      source-import manifest schema + internal no-loss checks
    evidence     committed proof/evidence records under evidence/
    real-instances  authored ADR/source/semantic/evidence/report instance corpus
    implementation  committed implementation artefact guard checks
    selftest     plant defects from tools/validate-spec/planted-defects/ and assert the exact rule id fires
    pr           base/head diff gate (--base, --head); fails closed if git fails
    all          schemas + enums + catalogues + registry + safety + fixtures + instances + imports + evidence + real-instances + implementation + selftest
                 (+ pr when --base/--head is given)

Options:
    --json              emit findings as JSON to stdout
    --report PATH       write a validator-report instance to PATH (self-validated)
    --base REF          PR base git ref
    --head REF          PR head git ref
"""
import argparse, copy, glob, hashlib, json, os, re, subprocess, sys
from collections import Counter, defaultdict

try:
    from jsonschema import Draft202012Validator
except Exception:
    print("ERROR: this tool requires the 'jsonschema' package (Draft 2020-12).", file=sys.stderr)
    sys.exit(2)

def _find_root(start):
    """Ascend until a directory contains both spec/ and docs/ (the repo root)."""
    d = os.path.abspath(start)
    while True:
        if os.path.isdir(os.path.join(d, "spec")) and os.path.isdir(os.path.join(d, "docs")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return os.path.abspath(start)
        d = parent


ROOT = _find_root(os.path.dirname(os.path.abspath(__file__)))
CORPUS = "tools/validate-spec"   # validator assets: fixtures/, manifests/, planted-defects/
SOURCE_REFERENCE_ALLOWLIST = f"{CORPUS}/source-reference-allowlist.json"
os.chdir(ROOT)

DRAFT = "https://json-schema.org/draft/2020-12/schema"
ALLOW_EMPTY_STR = {"value"}
FORB = re.compile(r"(^|[-./])(v2|legacy|old|new|temp|transitional)([-./]|$)")
REDUNDANT_USF = re.compile(r"(^|[-./])usf([-./]|$)")
ENVELOPE = ["id", "title", "description", "authorityLevel", "lifecycleState",
            "ontologyConcepts", "taxonomyRefs", "vocabularyRefs", "aiGuidance"]
SCHEMA_TOP_KEYS = ["$schema", "$id", "title", "description", "type", "required", "properties"]
CATALOGUE_SCHEMAS = {"schema-registry", "taxonomy", "vocabulary"}
DIRTY_PATHS = ["spec", "tools", "docs", "evidence", ".github"]
AUTHORITY_INDEX_PATH = "docs/architecture/current-state-foundation-authority-index.json"
REQUIRED_USF292_SEAL_RECORDS = {
    "docs/architecture/usf-current-state-foundation-closure-record.json",
    "docs/architecture/usf-current-state-foundation-closure-report.md",
    "docs/architecture/usf-current-state-foundation-closure-reference-retirement-scan.json",
    "docs/architecture/usf-current-state-foundation-closure-reference-retirement-scan.md",
    "docs/architecture/superseded-lineage-closure-provenance.json",
    "docs/architecture/superseded-lineage-closure-provenance.md",
}
AUTHORITY_INDEX_BOUNDARY_NON_CLAIMS = {
    "no-product-ui-readiness",
    "no-browser-e2e-readiness",
    "no-staging-readiness",
    "no-production-readiness",
    "no-deployment-readiness",
    "no-live-provider-readiness",
    "no-soc-readiness",
    "no-iso27001-certification",
    "no-enterprise-production-readiness",
    "no-full-product-readiness",
}
REQUIRED_FIELD_GUARDS = {
    "command": ["inputs", "outputs", "environmentScope", "sideEffects"],
    "observability-signal": ["purpose"],
    "audit-event": ["timestampSemantics", "securitySensitive", "stateChanging"],
    "workflow": ["participants", "ordering", "stateTransitions"],
}
# (item 5) Closure: every object with `properties` MUST be closed UNLESS its (schema, pointer)
# is an explicitly-declared, documented extension point. No $comment bypass.
# (item 5 review) Closure: every object (type:object or with properties) MUST be closed
# (additionalProperties/unevaluatedProperties false) UNLESS its (schema, pointer) is a DELIBERATE,
# documented extension point listed here with a reason. No $comment / properties-presence bypass.
_TYPED_EXT = "typed-value extension map: keys open by design, values constrained to scalars"
_DRAFT_META = "draft descriptive-metadata block; intentionally permissive in this draft per its $comment"
OPEN_EXTENSION_POINTS = {
    ("interface-contract", "/$defs/contractBody/properties/extensions"): _TYPED_EXT,
    ("workflow", "/$defs/workflowStep/properties/extensions"): _TYPED_EXT,
    ("workflow", "/$defs/stateTransition/properties/extensions"): _TYPED_EXT,
    ("ui-semantic-model", "/$defs/uiJourney/properties/extensions"): _TYPED_EXT,
    ("schema-registry", "/properties/identityNotes"): _DRAFT_META,
    ("schema-registry", "/properties/currentRepositoryState"): _DRAFT_META,
    ("schema-registry", "/properties/governance"): _DRAFT_META,
    ("schema-registry", "/properties/namingConventions"): _DRAFT_META,
    ("schema-registry", "/properties/commonRequirements"): _DRAFT_META,
    ("schema-registry", "/properties/commonEnvelope"): _DRAFT_META,
    ("taxonomy", "/properties/currentRepositoryState"): _DRAFT_META,
    ("taxonomy", "/properties/governance"): _DRAFT_META,
    ("taxonomy", "/properties/vocabularyDependencies"): _DRAFT_META,
    ("vocabulary", "/properties/currentRepositoryState"): _DRAFT_META,
    ("vocabulary", "/properties/governance"): _DRAFT_META,
}
# (item 5 review) tool/CI additions are blocking unless explicitly authorised here.
AUTHORIZED_TOOLING = {
    ".github/workflows/validate-spec.yml",
    ".github/workflows/proof-anchor.yml",
    "tools/validate-bootstrap/validate-bootstrap.py",
    "tools/generate-compose/generate-compose.py",
    "tools/validate-compose/check-compose-ports.py",
    "tools/validate-compose/validate-compose.py",
    "tools/validate-enterprise/validate-enterprise.py",
    "tools/validate-test-readiness/validate-test-readiness.py",
    "tools/validate-public-fqdn/validate-public-fqdn.py",
    "tools/validate-artifact-promotion/validate-artifact-promotion.py",
    "tools/validate-environment-ladder/validate-environment-ladder.py",
    "tools/validate-evidence-invalidation/validate-evidence-invalidation.py",
    "tools/validate-evidence-reuse/validate-evidence-reuse.py",
    "tools/validate-foundation-substrate-closure/validate-foundation-substrate-closure.py",
    "tools/validate-proof-cockpit-acceptance/validate-proof-cockpit-acceptance.py",
    "tools/proof-cockpit-compare/proof-cockpit-compare.py",
    "tools/repository-optimisation/measure-command-timing.py",
    "tools/repository-optimisation/realise-bounded-optimisation.py",
    "tools/github-runner/cleanup-workspace.sh",
    "tools/github-runner/common.sh",
    "tools/github-runner/install-runner.sh",
    "tools/github-runner/register-runner.sh",
    "tools/github-runner/remove-runner.sh",
    "tools/github-runner/rollback-to-github-hosted.sh",
    "tools/github-runner/start-runner.sh",
    "tools/github-runner/stop-runner.sh",
    "tools/github-runner/verify-runner-health.sh",
    "tools/github-runner/verify-secret-safety.sh",
    "tools/github-runner/watchdog-runner.sh",
    "tools/github-runner/verify-toolchain.sh",
    "tools/validate-linear-boundary/validate-linear-boundary.py",
    "tools/validate-repository-optimisation/validate-repository-optimisation.py",
    "tools/validate-app-surface/validate-app-surface.py",
    "tools/validate-spec/validate-spec.py",
    "tools/validate-spec/requirements.txt",
    "tools/validate-aggregate/validate-aggregate.py",
    "tools/validate-aggregate/selftest-fixtures/exit-zero.py",
    "tools/validate-aggregate/selftest-fixtures/exit-one.py",
    "tools/validate-parity/validate-parity.py",
    "tools/validate-parity/validate-db.py",
    "tools/validate-parity/validate-authz.py",
    "tools/validate-parity/validate-audit.py",
    "tools/validate-parity/validate-config.py",
    "tools/validate-parity/validate-files.py",
    "tools/validate-parity/validate-auth.py",
    "tools/validate-parity/validate-jobs.py",
    "tools/validate-parity/validate-notify.py",
    "tools/validate-parity/validate-api.py",
    "tools/validate-parity/validate-providers.py",
    "tools/validate-parity/validate-observability.py",
    "tools/validate-parity/validate-guardrails.py",
    "tools/validate-parity/validate-bulk.py",
    "tools/validate-parity/validate-search.py",
    "tools/validate-parity/validate-resources.py",
    "tools/validate-parity/validate-domain-depth.py",
    "tools/validate-runtime/validate-runtime.py",
}
# (item 4) Explicit enum -> vocabulary value-set bindings by (schema, JSON pointer). No guessing.
# Every "/properties/lifecycleState" enum binds to lifecycle-states (handled in resolve below).
ENUM_BINDINGS = {
    ("ai-governance", "/$defs/aiKind"): "ai-governance-kinds",
    ("audit-event", "/$defs/auditKind"): "audit-event-kinds",
    ("command", "/$defs/commandKind"): "command-kinds",
    ("command", "/$defs/environment"): "environment-classes",
    ("command", "/$defs/disposition"): "disposition-values",
    ("compose-service", "/$defs/realisationMode"): "compose-realisation-modes",
    ("compose-service", "/$defs/environmentScope"): "compose-environment-scopes",
    ("compose-service", "/$defs/lifecycle"): "compose-lifecycles",
    ("compose-service", "/$defs/dataBoundary"): "compose-data-boundaries",
    ("compose-service", "/$defs/sharingModel"): "compose-sharing-models",
    ("compose-service", "/$defs/serviceAuthorityLevel"): "compose-service-authority-levels",
    ("compose-service", "/$defs/accessModel"): "compose-access-models",
    ("compose-service", "/$defs/substitutionPolicy"): "compose-substitution-policies",
    ("compose-service", "/$defs/composePolicy"): "compose-policies",
    ("compose-service", "/$defs/deploymentForm"): "compose-deployment-forms",
    ("compose-service", "/$defs/classificationState"): "compose-classification-states",
    ("compose-service", "/$defs/serviceKind"): "compose-service-kinds",
    ("compose-service", "/$defs/humanDecisionState"): "compose-human-decision-states",
    ("compose-service", "/$defs/bindScope"): "compose-bind-scopes",
    ("compose-service", "/$defs/exposureClass"): "compose-exposure-classes",
    ("compose-service", "/$defs/concurrentEnvironmentPolicy"): "compose-concurrent-environment-policies",
    ("compose-service", "/$defs/portAllocationMode"): "compose-port-allocation-modes",
    ("compose-service", "/$defs/readinessTier"): "compose-readiness-tiers",
    ("compose-service", "/$defs/evidenceGrade"): "compose-evidence-grades",
    ("compose-service", "/$defs/serviceDataClassification"): "compose-service-data-classifications",
    ("compose-service", "/$defs/environmentDisposition"): "compose-environment-dispositions",
    ("compose-service", "/$defs/assetInventoryClass"): "compose-asset-inventory-classes",
    ("compose-service", "/$defs/accessPosture"): "compose-access-postures",
    ("compose-service", "/$defs/auditPosture"): "compose-audit-postures",
    ("compose-service", "/$defs/secretPosture"): "compose-secret-postures",
    ("compose-service", "/$defs/backupRestorePosture"): "compose-backup-restore-postures",
    ("compose-service", "/$defs/retentionPosture"): "compose-retention-postures",
    ("compose-service", "/$defs/providerBoundaryDisposition"): "compose-provider-boundary-dispositions",
    ("compose-service", "/$defs/authRequirement"): "compose-auth-requirements",
    ("compose-service", "/$defs/auditRequirement"): "compose-audit-requirements",
    ("compose-service", "/$defs/breakGlassRelevance"): "compose-break-glass-relevance",
    ("configuration", "/$defs/configurationKind"): "configuration-kinds",
    ("configuration", "/$defs/providerMode"): "provider-modes",
    ("configuration", "/$defs/environment"): "environment-classes",
    ("data-migration", "/$defs/dataKind"): "data-migration-kinds",
    ("environment", "/$defs/environment"): "environment-classes",
    ("environment", "/$defs/providerMode"): "provider-modes",
    ("environment-promotion", "/$defs/environmentClass"): "environment-classes",
    ("environment-promotion", "/$defs/providerMode"): "provider-modes",
    ("event-contract", "/$defs/eventWorkflowKind"): "event-workflow-kinds",
    ("evidence-envelope", "/$defs/providerMode"): "provider-modes",
    ("evidence-envelope", "/$defs/environment"): "environment-classes",
    ("evidence-envelope", "/properties/evidenceKind"): "evidence-kinds",
    ("evidence-envelope", "/properties/reportStatus"): "report-statuses",
    ("import-manifest", "/$defs/sourceKind"): "source-kinds",
    ("import-manifest", "/$defs/sourceRole"): "source-roles",
    ("import-manifest", "/$defs/disposition"): "disposition-values",
    ("interface-contract", "/$defs/interfaceKind"): "interface-kinds",
    ("semantic-contract", "/properties/capabilityDomain"): "capability-domains",
    ("observability-signal", "/$defs/signalKind"): "observability-signal-kinds",
    ("observability-signal", "/$defs/signalName"): "observability-signal-names",
    ("observability-signal", "/$defs/attributeName"): "observability-attribute-names",
    ("proof-evidence", "/$defs/proofLevel"): "proof-levels",
    ("proof-evidence", "/$defs/providerMode"): "provider-modes",
    ("proof-evidence", "/$defs/environment"): "environment-classes",
    ("runtime-proof", "/$defs/evidenceGrade"): "compose-evidence-grades",
    ("runtime-proof", "/$defs/providerClass"): "runtime-provider-classes",
    ("runtime-proof", "/$defs/providerBinding/properties/providerClass"): "runtime-provider-binding-classes",
    ("provider-mode", "/$defs/providerMode"): "provider-modes",
    ("provider-mode", "/$defs/environment"): "environment-classes",
    ("schema-registry", "/$defs/schemaClass"): "schema-classes",
    ("schema-registry", "/$defs/schemaLifecycleState"): "schema-lifecycle-states",
    ("schema-registry", "/$defs/authorityLevel"): "authority-levels",
    ("source-disposition", "/properties/disposition"): "disposition-values",
    ("source-disposition", "/properties/sourceKind"): "source-kinds",
    ("source-disposition", "/properties/sourceRole"): "source-roles",
    ("source-reference", "/$defs/sourceKind"): "source-kinds",
    ("source-reference", "/$defs/sourceRole"): "source-roles",
    ("source-reference", "/$defs/disposition"): "disposition-values",
    ("source-reference", "/properties/evidenceRole"): "evidence-kinds",
    ("taxonomy", "/$defs/classificationMode"): "classification-modes",
    ("taxonomy", "/$defs/lifecycleState"): "lifecycle-states",
    ("ui-semantic-model", "/$defs/uiKind"): "ui-semantic-kinds",
    ("validator-report", "/$defs/severity"): "validation-severities",
    ("validator-report", "/$defs/status"): "report-statuses",
    ("vocabulary", "/$defs/valueSetStatus"): "valueSetLifecycleStates",
    ("vocabulary", "/$defs/valueItemLifecycle"): "valueItemLifecycle",
    ("workflow", "/$defs/eventWorkflowKind"): "event-workflow-kinds",
}
# Unbound enums that are intentionally local (not vocabulary-backed); suppress the backstop.
ENUM_LOCAL_ALLOW = {
    ("adr", "/properties/decisionStatus"),
    ("compose-service", "/$defs/requiredState"),
    ("environment-promotion", "/$defs/dataPosture"),
    ("environment-promotion", "/$defs/destructionPosture"),
    ("environment-promotion", "/$defs/environmentStage"),
    ("environment-promotion", "/$defs/maturityLevel"),
    ("environment-promotion", "/$defs/promotionImpact"),
    ("environment-promotion", "/$defs/readinessClaim"),
}

RULES = {
    "USF-PARSE-001":    ("blocking", "Invalid JSON / unreadable file"),
    "USF-SHAPE-001":    ("blocking", "Catalogue missing a required top-level key"),
    "USF-META-001":     ("blocking", "JSON Schema meta-schema invalid"),
    "USF-META-002":     ("blocking", "$schema is not Draft 2020-12"),
    "USF-ID-001":       ("blocking", "$id is not urn:usf:schema:<name>"),
    "USF-ID-002":       ("blocking", "Duplicate $id across schemas"),
    "USF-NAME-001":     ("error",    "Schema path/name violates naming standard"),
    "USF-REQ-001":      ("blocking", "Schema file missing a required top-level key"),
    "USF-REQ-002":      ("blocking", "Description promises a field but it is not required"),
    "USF-REQ-003":      ("blocking", "Instance schema missing a governance-envelope required field"),
    "USF-CLOSE-001":    ("blocking", "Object not closed and not a declared extension point"),
    "USF-CLOSE-002":    ("error",    "required entry not present in properties"),
    "USF-REF-001":      ("blocking", "Broken local $ref"),
    "USF-REF-002":      ("error",    "Orphan $def (defined, never referenced)"),
    "USF-HOLLOW-001":   ("blocking", "Required string can be empty"),
    "USF-HOLLOW-003":   ("blocking", "String array item can be empty"),
    "USF-SET-001":      ("error",    "Set-like array missing uniqueItems"),
    "USF-FRESH-001":    ("blocking", "freshness object does not require commit"),
    "USF-ENUM-001":     ("blocking", "Bound enum differs from its vocabulary canonical set"),
    "USF-ENUM-002":     ("blocking", "Vocabulary alias accepted as a canonical enum value"),
    "USF-ENUM-003":     ("blocking", "Forbidden token present as an enum value"),
    "USF-ENUM-004":     ("blocking", "Bound enum pointer missing or has no enum (binding drift)"),
    "USF-ENUM-005":     ("error",    "Unbound enum resembles a vocabulary set; bind it explicitly"),
    "USF-ENUM-006":     ("blocking", "Enum binding disagrees with the value set named in the node $comment"),
    "USF-TAX-001":      ("blocking", "Registry taxonomyRefs item does not resolve"),
    "USF-VOCAB-001":    ("blocking", "Registry vocabularyRefs item does not resolve"),
    "USF-ONT-001":      ("blocking", "Registry governsOntologyConcepts item does not resolve"),
    "USF-REG-001":      ("blocking", "Schema file has no registry entry"),
    "USF-REG-002":      ("blocking", "Registry entry points at a missing file"),
    "USF-REG-003":      ("blocking", "Registry lifecycle/file-existence mismatch"),
    "USF-REG-005":      ("blocking", "Schema authorityLevel const != registry authorityRole"),
    "USF-REG-006":      ("blocking", "Duplicate registry schema id"),
    "USF-REG-007":      ("blocking", "Duplicate registry schema path"),
    "USF-REG-008":      ("blocking", "Registry class/lifecycle/authority value not canonical"),
    "USF-INV-001":      ("blocking", "Schema-file set and registry-declared set are not a bijection"),
    "USF-VOCAB-002":    ("blocking", "Vocabulary data integrity"),
    "USF-TAX-002":      ("blocking", "Taxonomy data integrity"),
    "USF-INSTANCE-001": ("blocking", "Catalogue instance invalid against its schema"),
    "USF-PROOF-001":    ("blocking", "proof: claimed level exceeds observed"),
    "USF-PROOF-002":    ("blocking", "proof: hermetic/non-live accepted as live-external"),
    "USF-ENV-001":      ("blocking", "environment: production-shaped accepted as production-live"),
    "USF-SECRET-001":   ("blocking", "configuration: secret/non-secret classification contradiction"),
    "USF-MIG-001":      ("blocking", "data-migration: mutable migration accepted"),
    "USF-REPORT-001":   ("blocking", "validator-report: pass accepted with blocking finding"),
    "USF-REPORT-002":   ("blocking", "validator-report: fail accepted with zero findings"),
    "USF-REPORT-003":   ("blocking", "generated report is outside the approved evidence home"),
    "USF-REPORT-004":   ("blocking", "generated report filename carries a status/readiness claim"),
    "USF-REPORT-005":   ("blocking", "generated report evidence reference does not resolve"),
    "USF-REPORT-006":   ("blocking", "generated report freshness is marked non-stale for a different commit than current HEAD"),
    "USF-FACET-001":    ("blocking", "semantic-contract: partial facet set accepted"),
    "USF-FIXTURE-001":  ("blocking", "Negative fixture not rejected by its schema"),
    "USF-FIXTURE-002":  ("blocking", "Positive fixture unexpectedly rejected"),
    "USF-FIXTURE-003":  ("blocking", "Negative fixture has no expected-reason manifest entry"),
    "USF-FIXTURE-004":  ("blocking", "Negative fixture rejected for the wrong reason"),
    "USF-INSTANCE-002": ("blocking", "Semantic corpus instance invalid against its schema"),
    "USF-INSTANCE-003": ("blocking", "Semantic corpus instance directory has no matching schema"),
    "USF-INSTANCE-004": ("blocking", "Semantic corpus instance reference does not resolve"),
    "USF-INSTANCE-005": ("blocking", "Semantic corpus instance id is duplicated"),
    "USF-NATIVE-001":   ("blocking", "Semantic corpus instance reference uses a cross-repo legacy discriminator (must be USF-native repo-local)"),
    "USF-IMPORT-001":   ("blocking", "Source import manifest invalid against import-manifest schema"),
    "USF-IMPORT-002":   ("blocking", "Source import manifest entry count mismatch"),
    "USF-IMPORT-003":   ("blocking", "Source import manifest sourceRef.path values are missing or duplicated"),
    "USF-IMPORT-004":   ("blocking", "Source import manifest contains a non-canonical controlled value"),
    "USF-IMPORT-005":   ("blocking", "Source import manifest targetUsfConcept reuses a source path"),
    "USF-IMPORT-006":   ("blocking", "Package metadata is not classified as a package unit"),
    "USF-IMPORT-007":   ("blocking", "Runtime proof script is not classified as proof evidence"),
    "USF-IMPORT-008":   ("blocking", "Source import sub-manifest invalid against import-manifest schema"),
    "USF-IMPORT-009":   ("blocking", "Source import sub-manifest row does not reconcile to baseline manifest"),
    "USF-IMPORT-010":   ("blocking", "Source import sub-manifest sourceRef.path values are missing or duplicated"),
    "USF-IMPORT-011":   ("blocking", "Source import sub-manifest targetUsfConcept is not extraction-useful"),
    "USF-IMPORT-012":   ("blocking", "Source import sub-manifest entry count mismatch"),
    "USF-IMPORT-013":   ("blocking", "Source import manifest audit base is inconsistent"),
    "USF-IMPORT-014":   ("blocking", "Source import sub-manifest target concept does not resolve to an instance"),
    "USF-SEMANTIC-001": ("blocking", "Semantic complete facet reference does not resolve"),
    "USF-SEMANTIC-002": ("blocking", "Coverage matrix semantic-contract target has no instance"),
    "USF-INTERFACE-001": ("blocking", "Implemented API route has no interface-contract coverage or explicit disposition"),
    "USF-INTERFACE-002": ("blocking", "API route interface-contract disposition is invalid or ambiguous"),
    "USF-INTERFACE-003": ("blocking", "OpenAPI projection claims semantic authority without USF-native backing"),
    "USF-CLIENT-CONTRACT-001": ("blocking", "Client-callable non-UI operation map is missing route coverage or authority mapping"),
    "USF-CLIENT-CONTRACT-002": ("blocking", "Client-callable non-UI operation metadata is missing or inconsistent"),
    "USF-CLIENT-CONTRACT-003": ("blocking", "Generated-client input status is stale or ambiguous"),
    "USF-CLIENT-CONTRACT-004": ("blocking", "Client-contract map overclaims generated-client, SDK, UI, public API, or readiness authority"),
    "USF-GENERATED-SDK-001": ("blocking", "Generated SDK/client readiness freshness or source-tree binding is stale or incomplete"),
    "USF-GENERATED-SDK-002": ("blocking", "Generated SDK/client readiness operation coverage is incomplete or inconsistent"),
    "USF-GENERATED-SDK-003": ("blocking", "Generated SDK/client readiness metadata, package, or fixture projection is incomplete"),
    "USF-GENERATED-SDK-004": ("blocking", "Generated SDK/client readiness overclaims publication, UI, public API, deployment, provider, compliance, monetisation, or human acceptance"),
    "USF-PUBLIC-API-001": ("blocking", "Public API readiness source, OpenAPI projection, or source-tree binding is stale or incomplete"),
    "USF-PUBLIC-API-002": ("blocking", "Public API readiness operation coverage or exposure disposition is incomplete or inconsistent"),
    "USF-PUBLIC-API-003": ("blocking", "Public API readiness versioning, documentation, security, audit, or telemetry semantics are incomplete"),
    "USF-PUBLIC-API-004": ("blocking", "Public API readiness overclaims deployment, provider, UI, publication, compliance, monetisation, app-store, or human acceptance"),
    "USF-CAPABILITY-REALISATION-001": ("blocking", "Current-main capability-service realisation map is missing semantic-contract coverage"),
    "USF-CAPABILITY-REALISATION-002": ("blocking", "Capability-service realisation traceability or implementation authority is invalid"),
    "USF-CAPABILITY-REALISATION-003": ("blocking", "Capability-service realisation freshness or historical-evidence boundary is invalid"),
    "USF-CAPABILITY-REALISATION-004": ("blocking", "Capability-service realisation map overclaims proof, generated reports, readiness, or generated-client authority"),
    "USF-EVIDENCE-001": ("blocking", "Evidence envelope invalid against evidence-envelope schema"),
    "USF-EVIDENCE-002": ("blocking", "Proof evidence invalid against proof-evidence schema"),
    "USF-EVIDENCE-003": ("blocking", "Evidence/proof id is duplicated"),
    "USF-EVIDENCE-004": ("blocking", "Proof collectedEvidence reference does not resolve to committed evidence"),
    "USF-EVIDENCE-005": ("blocking", "Evidence/proof source reference does not resolve"),
    "USF-EVIDENCE-006": ("blocking", "Proof evidence claimed level exceeds observed level"),
    "USF-EVIDENCE-007": ("blocking", "Proof evidence live-provider claim exceeds provider/level evidence"),
    "USF-EVIDENCE-008": ("blocking", "Evidence JSON file is outside a discovered evidence directory"),
    "USF-EVIDENCE-009": ("blocking", "Evidence freshness is marked non-stale for a different commit than current HEAD"),
    "USF-POSTURE-001":  ("blocking", "Proof evidence posture does not match collected runtime envelope posture"),
    "USF-POSTURE-002":  ("blocking", "Current proof readiness is claimed without an accepted freshness anchor"),
    "USF-REAL-001":     ("blocking", "Real-instance corpus category is missing"),
    "USF-REAL-002":     ("blocking", "Real ADR instance invalid against adr schema"),
    "USF-REAL-003":     ("blocking", "Real ADR machine instance has no matching markdown ADR"),
    "USF-REAL-004":     ("blocking", "Real ADR reference does not resolve"),
    "USF-REAL-005":     ("blocking", "Real validator-report instance invalid against validator-report schema"),
    "USF-REAL-006":     ("blocking", "Real ADR semantic reference is not a semantic artefact"),
    "USF-AUTHORITY-001": ("blocking", "Current-state foundation authority index is incomplete"),
    "USF-IMPL-001":     ("blocking", "Implementation artefact is not authorised by an implementation directive"),
    "USF-IMPL-002":     ("blocking", "Implementation artefact has no source disposition coverage"),
    "USF-IMPL-003":     ("blocking", "Implementation artefact mirrors a historical source path"),
    "USF-IMPL-004":     ("blocking", "Implementation artefact path uses a forbidden name"),
    "USF-IMPL-005":     ("blocking", "Implementation artefact is outside authorised target roots"),
    "USF-DIRECTIVE-001": ("blocking", "Implementation directive is missing accepted filled-directive content"),
    "USF-DIRECTIVE-002": ("blocking", "Implementation directive is missing whole-platform slice gate coverage or human-only acceptance boundary"),
    "USF-READINESS-001": ("blocking", "Readiness document contains stale pre-reconciliation state"),
    "USF-SELFTEST-001": ("blocking", "Planted defect did NOT raise its expected rule id"),
    "USF-PR-RUNTIME":   ("blocking", "PR adds implementation/runtime code"),
    "USF-PR-ACTIVE":    ("blocking", "PR marks a schema lifecycleState active"),
    "USF-PR-DELETE":    ("blocking", "PR deletes a schema file still referenced by the registry"),
    "USF-PR-TOOL":      ("blocking", "PR adds unauthorised tool/CI (not in AUTHORIZED_TOOLING)"),
    "USF-PR-DISPOSITION": ("blocking", "PR adds implementation file without source disposition coverage"),
    "USF-PR-FRESHNESS": ("blocking", "PR changes evidence/report JSON with non-stale freshness before post-merge publication"),
    "USF-ANCHOR-001":   ("blocking", "Proof freshness anchor payload is incomplete or malformed"),
    "USF-ANCHOR-002":   ("blocking", "Proof freshness anchor target/freshness commit mismatch"),
    "USF-ANCHOR-003":   ("blocking", "Proof freshness anchor payload digest mismatch"),
    "USF-ANCHOR-004":   ("blocking", "Proof freshness anchor proof level is overclaimed"),
    "USF-ANCHOR-005":   ("blocking", "Proof freshness anchor live-provider claim exceeds provider/level evidence"),
    "USF-ANCHOR-006":   ("blocking", "Proof freshness anchor production-live claim exceeds environment evidence"),
    "USF-ANCHOR-007":   ("blocking", "Generated report accepted as proof freshness anchor payload"),
    "USF-ANCHOR-008":   ("blocking", "Proof freshness anchor signer is not in the approved trust root"),
    "USF-BOOTSTRAP-001": ("blocking", "Bootstrap-readiness validator failed"),
    "USF-APPPLAN-001": ("blocking", "App-surface implementation plan path inventory is invalid"),
}


class Findings:
    def __init__(self):
        self.items = []

    def add(self, rule_id, subject, message=""):
        sev = RULES.get(rule_id, ("error", ""))[0]
        self.items.append({"severity": sev, "ruleId": rule_id, "subject": str(subject),
                           "message": message or RULES.get(rule_id, ("", ""))[1]})

    def rule_ids(self):
        return {f["ruleId"] for f in self.items}

    def blocking_or_error(self):
        return [f for f in self.items if f["severity"] in ("blocking", "error")]


_JSON_CACHE = {}


def load_json(path, F):
    abspath = os.path.abspath(path)
    try:
        if os.environ.get("USF_VALIDATE_SPEC_JSON_CACHE") == "0":
            with open(abspath, encoding="utf-8") as fh:
                return json.load(fh)
        stat = os.stat(abspath)
        key = (abspath, stat.st_mtime_ns, stat.st_size)
        if key not in _JSON_CACHE:
            with open(abspath, encoding="utf-8") as fh:
                _JSON_CACHE[key] = json.load(fh)
        return copy.deepcopy(_JSON_CACHE[key])
    except json.JSONDecodeError as e:
        F.add("USF-PARSE-001", path, f"{e.msg} at line {e.lineno} column {e.colno}")
    except OSError as e:
        F.add("USF-PARSE-001", path, str(e))
    return None


def load_text(path, F):
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except OSError as e:
        F.add("USF-PARSE-001", path, str(e))
        return None


def resolve_pointer(node, pointer):
    if not pointer:
        return node
    for seg in pointer.lstrip("/").split("/"):
        seg = seg.replace("~1", "/").replace("~0", "~")
        if isinstance(node, dict) and seg in node:
            node = node[seg]
        elif isinstance(node, list) and seg.isdigit() and int(seg) < len(node):
            node = node[int(seg)]
        else:
            return None
    return node


def walk(node, path, key, fn):
    fn(node, path, key)
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "properties" and isinstance(v, dict):
                for pk, pv in v.items():
                    walk(pv, f"{path}/properties/{pk}", pk, fn)
            else:
                walk(v, f"{path}/{k}", None, fn)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            walk(v, f"{path}/{i}", None, fn)


CATALOGUE_KEYS = {"vocabulary": ("valueSets", "valueSetLifecycleStates", "valueLifecycleStates"),
                  "taxonomy": ("taxonomies", "taxonomyFamilies"),
                  "registry": ("schemas",)}


def check_shape(voc, tax, reg, F):
    """Catalogue shape gate (review items 2/3): top-level arrays-of-objects PLUS every nested
    field the validator later indexes. Emits USF-SHAPE-001 and returns True if anything is wrong,
    so callers fail closed instead of throwing. Called by build_ctx (load time) and run_all_checks
    (so planted-defect selftests exercise it)."""
    for name, obj in (("vocabulary", voc), ("taxonomy", tax), ("registry", reg)):
        if not isinstance(obj, dict):
            F.add("USF-SHAPE-001", name, "catalogue root must be an object")
            return True
    fatal = False
    for name, obj, keys in (("vocabulary", voc, CATALOGUE_KEYS["vocabulary"]),
                            ("taxonomy", tax, CATALOGUE_KEYS["taxonomy"]),
                            ("registry", reg, CATALOGUE_KEYS["registry"])):
        for k in keys:
            if k not in obj:
                F.add("USF-SHAPE-001", name, f"missing top-level key '{k}'"); fatal = True
            elif not isinstance(obj[k], list) or not all(isinstance(x, dict) for x in obj[k]):
                F.add("USF-SHAPE-001", name, f"'{k}' must be an array of objects"); fatal = True
    if fatal:
        return True   # top-level shape broken; do not dig into nested members
    for i, vs in enumerate(voc["valueSets"]):
        if not isinstance(vs.get("id"), str):
            F.add("USF-SHAPE-001", "vocabulary", f"valueSets[{i}].id must be a string"); fatal = True
        if not isinstance(vs.get("values"), list):
            F.add("USF-SHAPE-001", "vocabulary", f"valueSets[{i}].values must be an array"); fatal = True
        else:
            for j, v in enumerate(vs["values"]):
                if not (isinstance(v, dict) and isinstance(v.get("id"), str)):
                    F.add("USF-SHAPE-001", "vocabulary", f"valueSets[{i}].values[{j}].id must be a string"); fatal = True
        aliases = vs.get("aliases", [])
        if "aliases" in vs and not isinstance(aliases, list):
            F.add("USF-SHAPE-001", "vocabulary", f"valueSets[{i}].aliases must be an array"); fatal = True
        elif isinstance(aliases, list):
            for j, a in enumerate(aliases):
                if not isinstance(a, dict):
                    F.add("USF-SHAPE-001", "vocabulary", f"valueSets[{i}].aliases[{j}] must be an object"); fatal = True
                elif not (isinstance(a.get("id"), str) and isinstance(a.get("canonical"), str)):
                    F.add("USF-SHAPE-001", "vocabulary", f"valueSets[{i}].aliases[{j}] needs string id/canonical"); fatal = True
    for key in ("valueSetLifecycleStates", "valueLifecycleStates"):
        for i, x in enumerate(voc[key]):
            if not isinstance(x.get("id"), str):
                F.add("USF-SHAPE-001", "vocabulary", f"{key}[{i}].id must be a string"); fatal = True
    for i, t in enumerate(tax["taxonomies"]):
        if not (isinstance(t.get("id"), str) and isinstance(t.get("family"), str)):
            F.add("USF-SHAPE-001", "taxonomy", f"taxonomies[{i}] needs string id and family"); fatal = True
    for i, fa in enumerate(tax["taxonomyFamilies"]):
        if not isinstance(fa.get("id"), str):
            F.add("USF-SHAPE-001", "taxonomy", f"taxonomyFamilies[{i}].id must be a string"); fatal = True
    for i, e in enumerate(reg["schemas"]):
        for k in ("id", "path", "class", "lifecycleState", "authorityRole"):
            if not isinstance(e.get(k), str):
                F.add("USF-SHAPE-001", "registry", f"schemas[{i}].{k} must be a string"); fatal = True
    return fatal


def build_ctx(F):
    """Parse-safe load. Returns ctx, or None if the corpus cannot be loaded (findings added)."""
    files = sorted(glob.glob("spec/schemas/*.schema.json"))
    if not files:
        F.add("USF-PARSE-001", "spec/schemas", "no schema files found")
        return None
    sd = {}
    for f in files:
        d = load_json(f, F)
        if d is None:
            continue
        if not isinstance(d, dict):
            F.add("USF-SHAPE-001", f, "schema root must be an object")
            continue
        sd[os.path.basename(f).replace(".schema.json", "")] = d
    voc = load_json("spec/vocabularies/vocabulary-catalog.json", F)
    tax = load_json("spec/taxonomies/taxonomy-catalog.json", F)
    reg = load_json("spec/registries/schema-registry.json", F)
    if voc is None or tax is None or reg is None or check_shape(voc, tax, reg, F) or not sd:
        return None
    canon = {vs["id"]: set(v.get("id") for v in vs.get("values", [])) for vs in voc["valueSets"]}
    aliass = {vs["id"]: set(a.get("id") for a in vs.get("aliases", [])) for vs in voc["valueSets"]}
    recog = dict(canon)
    recog["valueSetLifecycleStates"] = set(x["id"] for x in voc["valueSetLifecycleStates"])
    recog["valueLifecycleStates"] = set(x["id"] for x in voc["valueLifecycleStates"])
    recog["valueItemLifecycle"] = recog["valueLifecycleStates"] - {"alias"}
    onto_doc = load_text("docs/architecture/ontology.md", F)
    if onto_doc is None:
        return None
    onto = set(re.findall(r'^#+\s*5\.\d+\s+(.+?)\s*$', onto_doc, re.M))
    fvs = voc.get("forbiddenValues", [])
    forbidden = {fv.get("token") for fv in fvs if isinstance(fv, dict)} if isinstance(fvs, list) else set()
    return dict(files=files, sd=sd, voc=voc, tax=tax, reg=reg, canon=canon, aliass=aliass, recog=recog,
                onto=onto, forbidden=forbidden, vocab_ids=set(canon),
                tax_ids=set(t["id"] for t in tax["taxonomies"]),
                fam_ids=set(f["id"] for f in tax["taxonomyFamilies"]))


def check_schemas(ctx, F):
    ids_seen = {}
    for name, d in ctx["sd"].items():
        if not isinstance(d, dict):
            F.add("USF-SHAPE-001", name, "schema root must be an object")
            continue
        try:
            Draft202012Validator.check_schema(d)
        except Exception as e:
            F.add("USF-META-001", name, str(e)[:120])
        if d.get("$schema") != DRAFT:
            F.add("USF-META-002", name, str(d.get("$schema")))
        if d.get("$id") != f"urn:usf:schema:{name}":
            F.add("USF-ID-001", name, str(d.get("$id")))
        ids_seen.setdefault(d.get("$id"), []).append(name)
        path = f"spec/schemas/{name}.schema.json"
        if FORB.search(name) or FORB.search(d.get("$id", "")) or REDUNDANT_USF.search(path) \
                or not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name):
            F.add("USF-NAME-001", path)
        for k in SCHEMA_TOP_KEYS:
            if k not in d:
                F.add("USF-REQ-001", name, f"missing {k}")
        if not str(d.get("title", "")).strip() or not str(d.get("description", "")).strip():
            F.add("USF-REQ-001", name, "empty title/description")
        if name not in CATALOGUE_SCHEMAS:
            req = d.get("required", []) if isinstance(d.get("required"), list) else []
            for ef in ENVELOPE:
                if ef not in req:
                    F.add("USF-REQ-003", name, f"missing {ef}")
        for fld in REQUIRED_FIELD_GUARDS.get(name, []):
            if fld not in (d.get("required", []) if isinstance(d.get("required"), list) else []):
                F.add("USF-REQ-002", name, f"{fld} promised by description but not required")
        refs = []
        walk(d, "", None, lambda n, p, k: refs.append(n["$ref"])
             if isinstance(n, dict) and isinstance(n.get("$ref"), str) else None)
        for r in refs:
            if r.startswith("#/") and resolve_pointer(d, r[1:]) is None:
                F.add("USF-REF-001", name, r)
        used = {m.group(1) for r in refs for m in [re.match(r"#/\$defs/([^/]+)$", r)] if m}
        for o in set(d.get("$defs", {})) - used:
            F.add("USF-REF-002", name, f"$defs/{o}")

        def chk(n, p, k):
            if not isinstance(n, dict):
                return
            cond = any(s in p for s in ("/if", "/then", "/else", "/not"))
            objlike = n.get("type") == "object" or "properties" in n
            closed = n.get("additionalProperties") is False or n.get("unevaluatedProperties") is False
            if objlike and not closed and not cond and (name, p) not in OPEN_EXTENSION_POINTS:
                F.add("USF-CLOSE-001", name, p)
            if n.get("additionalProperties") is False and isinstance(n.get("required"), list) and "properties" in n:
                for r in [r for r in n["required"] if r not in n["properties"]]:
                    F.add("USF-CLOSE-002", name, f"{p}: {r}")
            if k is not None and k not in ALLOW_EMPTY_STR and n.get("type") == "string" \
                    and not ({"minLength", "const", "enum", "pattern"} & set(n)):
                F.add("USF-HOLLOW-001", name, p)
            if n.get("type") == "array":
                it = n.get("items")
                if isinstance(it, dict) and it.get("type") == "string" \
                        and not ({"minLength", "const", "enum", "pattern"} & set(it)):
                    F.add("USF-HOLLOW-003", name, p)
                if isinstance(it, dict) and (it.get("type") == "string" or "$ref" in it) and "uniqueItems" not in n:
                    F.add("USF-SET-001", name, p)
            if k == "freshness" and n.get("type") == "object" and "commit" not in (n.get("required") or []):
                F.add("USF-FRESH-001", name, p)
        walk(d, "", None, chk)
    for sid, names in ids_seen.items():
        if len(names) > 1:
            F.add("USF-ID-002", sid, str(names))


def binding_for(schema, pointer):
    if pointer == "/properties/lifecycleState":
        return "lifecycle-states"
    return ENUM_BINDINGS.get((schema, pointer))


def check_enums(ctx, F):
    """Explicit-binding enum fidelity (item 4). No guessing: each controlled enum is bound to a
    value set; assert exact equality, alias-disjoint, forbidden-disjoint. A fail-closed backstop
    flags any UNbound enum that resembles a non-empty value set."""
    recog, aliass, forbidden = ctx["recog"], ctx["aliass"], ctx["forbidden"]
    nonempty = {sid: vals for sid, vals in recog.items() if vals}
    for name, d in ctx["sd"].items():
        enums = []
        walk(d, "", None, lambda n, p, k: enums.append((p, list(n["enum"])))
             if isinstance(n, dict) and isinstance(n.get("enum"), list)
             and not any(s in p for s in ("/if", "/then", "/else", "/not")) else None)
        for pointer, values in enums:
            actual = set(values)
            vsid = binding_for(name, pointer)
            if vsid:
                canonical = recog.get(vsid)
                if canonical is None:
                    F.add("USF-ENUM-004", f"{name}{pointer}", f"unknown value set {vsid}")
                    continue
                if actual != canonical:
                    F.add("USF-ENUM-001", f"{name}{pointer}",
                          f"!= {vsid}: extra={sorted(actual - canonical)} missing={sorted(canonical - actual)}")
                if actual & aliass.get(vsid, set()):
                    F.add("USF-ENUM-002", f"{name}{pointer}", f"aliases {sorted(actual & aliass.get(vsid, set()))} of {vsid}")
                if actual & forbidden:
                    F.add("USF-ENUM-003", f"{name}{pointer}", f"forbidden {sorted(actual & forbidden)}")
                node = resolve_pointer(d, pointer)
                comment = node.get("$comment", "") if isinstance(node, dict) else ""
                declared = {sid for sid in recog if re.search(r"(?<![a-z-])" + re.escape(sid) + r"(?![a-z-])", comment)}
                if declared and vsid not in declared:
                    F.add("USF-ENUM-006", f"{name}{pointer}",
                          f"binding {vsid} disagrees with the value set named in $comment {sorted(declared)}")
            elif (name, pointer) not in ENUM_LOCAL_ALLOW:
                for sid, vals in nonempty.items():
                    if actual == vals or (actual > vals and len(actual & vals) >= 2) or \
                       (actual != vals and len(actual & vals) >= 2):
                        F.add("USF-ENUM-005", f"{name}{pointer}",
                              f"resembles {sid} (shared {sorted(actual & vals)}); add an explicit binding or allowlist")
                        break
    # bound pointers that no longer exist => binding drift
    for (schema, pointer), vsid in ENUM_BINDINGS.items():
        d = ctx["sd"].get(schema)
        if d is None:
            continue
        node = resolve_pointer(d, pointer)
        if not isinstance(node, dict) or "enum" not in node:
            F.add("USF-ENUM-004", f"{schema}{pointer}", f"bound to {vsid} but enum not found")


def check_registry(ctx, F):
    reg, sd = ctx["reg"], ctx["sd"]
    reg_by_path = {e["path"]: e for e in reg["schemas"]}
    file_paths = {f"spec/schemas/{n}.schema.json" for n in sd}
    if set(reg_by_path) != file_paths:
        for p in file_paths - set(reg_by_path):
            F.add("USF-REG-001", p)
        for p in set(reg_by_path) - file_paths:
            F.add("USF-REG-002", p)
        F.add("USF-INV-001", "registry", f"{len(file_paths)} files vs {len(reg_by_path)} entries")
    for p in reg_by_path:
        if not os.path.exists(p):
            F.add("USF-REG-002", p)
    for name, d in sd.items():
        e = reg_by_path.get(f"spec/schemas/{name}.schema.json")
        if not e or not isinstance(d, dict):
            continue
        al = d.get("properties", {}).get("authorityLevel", {})
        if al.get("const") and al["const"] != e["authorityRole"]:
            F.add("USF-REG-005", name, f"{al['const']} != {e['authorityRole']}")
    for e in reg["schemas"]:
        for t in e.get("taxonomyRefs", []):
            if t not in ctx["tax_ids"]:
                F.add("USF-TAX-001", e["id"], t)
        for v in e.get("vocabularyRefs", []):
            if v not in ctx["vocab_ids"]:
                F.add("USF-VOCAB-001", e["id"], v)
        for c in e.get("governsOntologyConcepts", []):
            if c not in ctx["onto"]:
                F.add("USF-ONT-001", e["id"], c)
        if e.get("class") not in ctx["canon"]["schema-classes"]:
            F.add("USF-REG-008", e["id"], f"class {e.get('class')}")
        if e.get("lifecycleState") not in ctx["canon"]["schema-lifecycle-states"]:
            F.add("USF-REG-008", e["id"], f"lifecycle {e.get('lifecycleState')}")
        if e.get("authorityRole") not in ctx["canon"]["authority-levels"]:
            F.add("USF-REG-008", e["id"], f"authority {e.get('authorityRole')}")
        if e.get("lifecycleState") == "active" and not os.path.exists(e["path"]):
            F.add("USF-REG-003", e["id"], "active without file")
    rids = [e["id"] for e in reg["schemas"]]
    rpaths = [e["path"] for e in reg["schemas"]]
    if len(set(rids)) != len(rids):
        F.add("USF-REG-006", "registry", str([x for x in rids if rids.count(x) > 1]))
    if len(set(rpaths)) != len(rpaths):
        F.add("USF-REG-007", "registry", str([x for x in rpaths if rpaths.count(x) > 1]))


def check_catalogues(ctx, F):
    """Validate the in-context catalogue instances against their schemas + data integrity.
    Uses ctx (not a re-read) so planted-defect selftests exercise this path."""
    voc, tax = ctx["voc"], ctx["tax"]
    for n, inst in (("schema-registry", ctx["reg"]), ("taxonomy", ctx["tax"]), ("vocabulary", ctx["voc"])):
        for err in Draft202012Validator(ctx["sd"][n]).iter_errors(inst):
            F.add("USF-INSTANCE-001", n, err.message[:120])
    vsids = [vs["id"] for vs in voc["valueSets"]]
    if len(set(vsids)) != len(vsids):
        F.add("USF-VOCAB-002", "vocabulary", "duplicate value-set id")
    for vs in voc["valueSets"]:
        vids = [v["id"] for v in vs.get("values", [])]
        cset = set(vids)
        if len(set(vids)) != len(vids):
            F.add("USF-VOCAB-002", vs["id"], "duplicate value id")
        for a in vs.get("aliases", []):
            if a.get("canonical") not in cset:
                F.add("USF-VOCAB-002", vs["id"], f"alias {a.get('id')} unresolved")
            if a.get("id") in cset:
                F.add("USF-VOCAB-002", vs["id"], f"alias {a.get('id')} is also canonical")
    for t in tax["taxonomies"]:
        if t.get("family") not in ctx["fam_ids"]:
            F.add("USF-TAX-002", t["id"], f"family {t.get('family')} unknown")
        if t.get("classificationMode") not in ctx["canon"]["classification-modes"]:
            F.add("USF-TAX-002", t["id"], f"mode {t.get('classificationMode')}")
    ttids = [t["id"] for t in tax["taxonomies"]]
    if len(set(ttids)) != len(ttids):
        F.add("USF-TAX-002", "taxonomy", "duplicate taxonomy id")


def check_safety(ctx, F):
    sd = ctx["sd"]

    def V(n):
        return Draft202012Validator(sd[n])

    def E(al, **k):
        return {"id": "x", "title": "t", "description": "d", "authorityLevel": al, "lifecycleState": "draft",
                "ontologyConcepts": ["X"], "taxonomyRefs": ["x-classification"], "vocabularyRefs": ["x-kinds"],
                "aiGuidance": "g", **k}

    def pe(**k):
        return E("runtime-proof-evidence", kind="proof", emittedEvidence=["e"], collectedEvidence=["c"],
                 freshness={"commit": "c"}, **k)

    cases = [
        ("USF-PROOF-001", "proof-evidence", pe(proofLevelClaimed="substrate-proven", proofLevelObserved="behaviour-proven",
                                               providerMode="local-composed-real-service", environment="integration")),
        ("USF-PROOF-002", "proof-evidence", pe(proofLevelClaimed="behaviour-proven", proofLevelObserved="behaviour-proven",
                                               providerMode="hermetic-mock", environment="hermetic", liveExternalProviderClaim=True)),
        ("USF-ENV-001", "environment", E("semantic-definition", environment="production-shaped", productionLiveClaim=True)),
        ("USF-SECRET-001", "configuration", E("semantic-definition", configurationKind="secret-bearing-setting", purpose="p", secretBearing=False)),
        ("USF-SECRET-001", "configuration", E("semantic-definition", configurationKind="non-secret-setting", purpose="p", secretBearing=True)),
        ("USF-MIG-001", "data-migration", E("semantic-definition", dataKind="migration", migrationOrder=1, checksum="c", immutable=False)),
        ("USF-REPORT-001", "validator-report", E("generated-report", status="pass", evidenceRefs=["e"],
                                                 freshness={"commit": "a", "stale": False},
                                                 findings=[{"severity": "blocking", "subject": "s", "message": "m"}])),
        ("USF-REPORT-002", "validator-report", E("generated-report", status="fail", evidenceRefs=["e"], findings=[])),
        ("USF-FACET-001", "semantic-contract", E("semantic-definition", facets={"proof": {"status": "gap"}})),
    ]
    for rule_id, schema, rec in cases:
        if not list(V(schema).iter_errors(rec)):
            F.add(rule_id, schema, "degenerate record was NOT rejected (safety regression)")


def load_manifest(F):
    """Parse-safe (item 4): a malformed manifest yields USF-PARSE-001, never a silent skip."""
    entries = {}
    for mf in sorted(glob.glob(f"{CORPUS}/manifests/*.json")):
        data = load_json(mf, F)
        if data is None:
            continue
        if not isinstance(data, list):
            F.add("USF-PARSE-001", mf, "manifest must be a JSON array of entries")
            continue
        for e in data:
            if isinstance(e, dict) and "path" in e:
                entries[e["path"]] = e
            else:
                F.add("USF-PARSE-001", mf, f"malformed manifest entry: {str(e)[:60]}")
    return entries


def check_fixtures(ctx, F):
    """Positive fixtures must validate; negative fixtures must be rejected FOR THE INTENDED REASON
    declared in tools/validate-spec/manifests/*.json (item 3a)."""
    sd = ctx["sd"]
    pos = sorted(glob.glob(f"{CORPUS}/fixtures/positive/**/*.json", recursive=True))
    neg = sorted(glob.glob(f"{CORPUS}/fixtures/negative/**/*.json", recursive=True))
    if not pos and not neg:
        return "not-run"
    manifest = load_manifest(F)

    def schema_for(path):
        return os.path.basename(os.path.dirname(path))

    for p in pos:
        schema = schema_for(p)
        if schema not in sd:
            F.add("USF-FIXTURE-002", p, f"no schema '{schema}'")
            continue
        errs = list(Draft202012Validator(sd[schema]).iter_errors(load_json(p, F)))
        if errs:
            F.add("USF-FIXTURE-002", p, errs[0].message[:120])
    for p in neg:
        schema = schema_for(p)
        if schema not in sd:
            F.add("USF-FIXTURE-001", p, f"no schema '{schema}'")
            continue
        errs = list(Draft202012Validator(sd[schema]).iter_errors(load_json(p, F)))
        if not errs:
            F.add("USF-FIXTURE-001", p, "expected rejection, schema accepted it")
            continue
        rel = p.split("/fixtures/", 1)[1]
        spec = manifest.get(rel)
        if not spec:
            F.add("USF-FIXTURE-003", p, "no expected-reason manifest entry")
            continue
        kw = spec.get("keyword")
        ptr = spec.get("pointer")
        ok = any(e.validator == kw and (ptr is None or ptr == "/" + "/".join(str(x) for x in e.absolute_path))
                 for e in errs)
        if not ok:
            got = sorted({f"{e.validator}@/{'/'.join(str(x) for x in e.absolute_path)}" for e in errs})
            F.add("USF-FIXTURE-004", p, f"expected {kw}@{ptr}; got {got[:4]}")
    return "ran"


# USF is self-defined (constitutional amendment: self-defining USF, external lineage retired). The source-import
# manifest is USF's own source-path registry; external repository/tag attribution is
# discarded. The audit base pins the self-defined top-level repository label, the freeze
# commit the entries were captured at, and the fixed entry count. Per-entry sourceRefs carry
# only the freeze commit (no per-entry repository, no external tag), so entrySourceRefFields
# names exactly which attribution fields a per-entry sourceRef is checked against.
SOURCE_AUDIT_BASE = {
    "repository": "usf",
    "commit": "a92d9734cf0f1f7a53f9093ce3bb3d2c02bfd767",
    "entryCount": 1673,
    "entrySourceRefFields": ("commit",),
}


INSTANCE_REF_FIELDS = {
    "sourceRefs", "adrRefs", "evidenceRefs", "proofRefs", "readinessGateRefs",
    "capabilityRefs", "relatedEvents", "relatedInterfaces", "references",
    "participants", "consumers", "commandQueryMappings",
}
INSTANCE_REF_SCALARS = {
    "semanticContractRef", "payloadSchemaRef", "relatedInterface", "relatedWorkflow",
    "producer", "source",
}

# USF-302 (owner decision): the discriminator convention for governed semantic /
# ADR references is USF-native ONLY. A governed instance reference (the INSTANCE_REF_*
# fields above) MUST be a canonical repo-local USF path (e.g. "docs/adr/0005-...md"),
# never a cross-repo legacy discriminator. Historical source lineage is carried by the
# source-import manifest + source-reference allowlist mechanism and by lineage-narrative
# prose (description/aiGuidance), NOT by these governed reference fields. This guard is
# scoped to the collected reference fields only; it does not inspect prose, the
# allowlist/manifest mechanism files, or lineage docs.
#
# The discriminator is defined GENERICALLY (no hard-coded external repository name), so the
# guard enforces the self-defined posture against any external/sibling-repository reference,
# not one named legacy source. A cross-repo legacy discriminator is either:
#   (a) a parent-relative sibling-repository path segment — "../<name>/" — reaching outside
#       this repository into a sibling checkout. The sibling token is forbidden whether
#       it is the whole reference ("../source"), a leading path segment ("../source/..."),
#       or a URI/fragment base ("../source#..."); or
#   (b) a "*-origin" cross-repo attribution token in the REPOSITORY POSITION — "<name>-origin"
#       as the whole reference or its leading path segment — naming an external source
#       repository as the origin of a governed reference.
# Both forms are forbidden in a governed reference. A canonical repo-local USF path
# ("docs/...", "spec/...", "tools/...", "urn:usf:...", "source:...") matches neither. The
# "*-origin" form is anchored to the repository position (start of the reference) so a
# repo-local path with an "-origin" domain component deeper in it (e.g. an
# "auth-origin" evidence file under docs/) is NOT a cross-repo discriminator.
CROSS_REPO_DISCRIMINATOR_PATTERNS = (
    ("parent-relative sibling-repository path", re.compile(r"\.\./[A-Za-z0-9._-]+(?=$|[/#?])")),
    ("cross-repo '*-origin' repository attribution token", re.compile(r"^[A-Za-z0-9._-]+-origin(?=$|[/#?])")),
)


def _cross_repo_discriminator(ref):
    """Return a description of the first cross-repo legacy discriminator in ref, else None.

    Generic by construction: it recognises any external/sibling-repository discriminator
    shape without naming a specific legacy source repository.
    """
    if not isinstance(ref, str):
        return None
    for label, pattern in CROSS_REPO_DISCRIMINATOR_PATTERNS:
        match = pattern.search(ref)
        if match is not None:
            return f"{label} '{match.group(0)}'"
    return None


def _collect_instance_refs(node, path="$"):
    if isinstance(node, dict):
        for k, v in node.items():
            here = f"{path}.{k}"
            if k in INSTANCE_REF_FIELDS and isinstance(v, list):
                for item in v:
                    if isinstance(item, str):
                        yield here, item
            elif k in INSTANCE_REF_SCALARS and isinstance(v, str):
                yield here, v
            elif k == "operation" and ".steps[" in here and isinstance(v, str):
                yield here, v
            yield from _collect_instance_refs(v, here)
    elif isinstance(node, list):
        for i, item in enumerate(node):
            yield from _collect_instance_refs(item, f"{path}[{i}]")


def _schema_for_instance_path(path):
    marker = "spec/instances/"
    rel = path.split(marker, 1)[1] if marker in path else path
    return rel.split("/", 1)[0].split(os.sep, 1)[0]


def _validate_semantic_complete_facets(F, path, data, resolves):
    facets = data.get("facets") if isinstance(data, dict) else None
    if not isinstance(facets, dict):
        return
    for facet_name, facet in facets.items():
        if not isinstance(facet, dict) or facet.get("status") != "complete":
            continue
        for field in ("sourceRefs", "evidenceRefs"):
            refs = facet.get(field, [])
            if not isinstance(refs, list):
                continue
            for ref in refs:
                if isinstance(ref, str) and not resolves(ref):
                    F.add("USF-SEMANTIC-001", f"{path}:facets.{facet_name}.{field}", f"unresolved reference: {ref}")


def _semantic_contract_targets_from_matrix(matrix_text):
    in_matrix = False
    for line in matrix_text.splitlines():
        if line.strip() == "## Capability Matrix":
            in_matrix = True
            continue
        if in_matrix and line.startswith("## "):
            break
        if not in_matrix or not line.startswith("| "):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) < 5 or not cells[0].isdigit():
            continue
        for target in re.findall(r"semantic-contract\.([a-z0-9-]+)", cells[4]):
            yield "semantic-contract." + target


def validate_semantic_coverage_matrix(F, matrix_text, semantic_contract_ids, matrix_path):
    missing = sorted(set(_semantic_contract_targets_from_matrix(matrix_text)) - set(semantic_contract_ids))
    for target in missing:
        F.add("USF-SEMANTIC-002", matrix_path, f"missing semantic contract instance: {target}")


API_ROUTE_INTERFACE_COVERAGE_PATH = "docs/architecture/api-route-interface-contract-coverage.json"
API_ROUTE_INTERFACE_DECISIONS = {"interface-contract-instance", "deferred", "rejected"}
API_ROUTE_INTERFACE_PROJECTION_ONLY = "projection-only"
API_ROUTE_INTERFACE_ROUTE_REF_PREFIX = "packages/contracts/src/api-surface.ts#routeId="
API_ROUTE_INTERFACE_OPENAPI_REF_PREFIX = "packages/openapi/openapi.json#operationId="
API_ROUTE_INTERFACE_COVERAGE_REF_PREFIX = API_ROUTE_INTERFACE_COVERAGE_PATH + "#routeId="
NON_UI_CLIENT_CONTRACT_MAP_PATH = "docs/architecture/non-ui-client-callable-contract-map.json"
NON_UI_CLIENT_CONTRACT_REF_PREFIX = NON_UI_CLIENT_CONTRACT_MAP_PATH + "#routeId="
NON_UI_CLIENT_CONTRACT_DISPOSITIONS = {
    "client-callable-local-contract",
    "operator-tooling-local-contract",
    "internal-support-only",
    "not-claimed",
}
NON_UI_CLIENT_CONSUMER_SURFACES = {
    "mobile-adapter",
    "web-adapter",
    "operator-tooling-with-explicit-authority",
    "none",
}
NON_UI_CLIENT_GENERATED_STATUSES = {
    "not-generated-current-main",
    "local-semantic-input-current",
    "not-authorised-for-generation",
}
NON_UI_CLIENT_REQUIRED_NONCLAIMS = {
    "no-generated-sdk-readiness-claim",
    "no-generated-client-readiness-claim",
    "no-product-ui-readiness-claim",
    "no-public-api-readiness-claim",
}
NON_UI_CLIENT_READINESS_CLAIMS = {
    "generatedClientReady",
    "sdkReady",
    "productUiReady",
    "publicApiReady",
    "deploymentReady",
    "stagingReady",
    "productionReady",
    "liveProviderReady",
    "humanAcceptanceComplete",
}


def _load_api_route_records(F):
    data = load_json("packages/openapi/openapi.json", F)
    if not isinstance(data, dict):
        return []
    paths = data.get("paths")
    if not isinstance(paths, dict):
        F.add("USF-INTERFACE-001", "packages/openapi/openapi.json:paths", "OpenAPI paths object is missing")
        return []
    records = []
    for path, methods in paths.items():
        if not isinstance(path, str) or not isinstance(methods, dict):
            continue
        for method, operation in methods.items():
            if method.lower() not in {"get", "post", "put", "patch", "delete"}:
                continue
            if not isinstance(operation, dict):
                continue
            metadata = operation.get("x-usf-route")
            if not isinstance(metadata, dict):
                F.add("USF-INTERFACE-001", f"packages/openapi/openapi.json:{path}:{method}", "operation lacks x-usf-route metadata")
                continue
            records.append({
                "routeId": metadata.get("routeId"),
                "method": method.upper(),
                "openapiPath": path,
                "openapiOperationId": operation.get("operationId"),
                "routeClassification": metadata.get("routeClassification"),
                "owningDomain": metadata.get("owningDomain"),
                "owningCapability": metadata.get("owningCapability"),
                "requiredAction": metadata.get("requiredAction"),
                "tenantScope": metadata.get("tenantScope"),
                "pdpPolicy": metadata.get("pdpPolicy"),
                "auditPolicy": metadata.get("auditPolicy"),
                "dataClassification": metadata.get("dataClassification"),
                "implementation": metadata.get("implementation"),
                "semanticAuthority": metadata.get("semanticAuthority") or operation.get("semanticAuthority"),
                "authorityLevel": metadata.get("authorityLevel") or operation.get("authorityLevel"),
                "openapiAuthorityClaim": metadata.get("openapiAuthorityClaim") or operation.get("openapiAuthorityClaim"),
            })
    return records


def _route_openapi_authority_claim(route):
    for field in ("openapiAuthorityClaim", "semanticAuthority", "authorityLevel"):
        claim = route.get(field) if isinstance(route, dict) else None
        if not isinstance(claim, str) or not claim:
            continue
        if claim not in {"projection-only", "generated-projection", "lower-authority-projection"}:
            return field, claim
    return None


def _load_api_route_interface_coverage(F):
    data = load_json(API_ROUTE_INTERFACE_COVERAGE_PATH, F)
    if data is None:
        F.add("USF-INTERFACE-001", API_ROUTE_INTERFACE_COVERAGE_PATH, "coverage artefact is missing")
        return None
    if not isinstance(data, dict):
        F.add("USF-INTERFACE-001", API_ROUTE_INTERFACE_COVERAGE_PATH, "coverage artefact must be an object")
        return None
    return data


def _as_nonempty_string(value):
    return isinstance(value, str) and bool(value.strip())


def _string_list(value):
    return value if isinstance(value, list) and all(isinstance(item, str) for item in value) else []


def _route_key(route):
    if not isinstance(route, dict):
        return "<invalid>"
    return str(route.get("routeId") or "<missing-route-id>")


def _validate_route_interface_contract(F, subject, route, record, instance, semantic_contract_ids):
    if not isinstance(instance, dict):
        F.add("USF-INTERFACE-001", subject, f"interfaceContractRef does not resolve: {record.get('interfaceContractRef')}")
        return
    if instance.get("interfaceKind") != "api-route":
        F.add("USF-INTERFACE-002", subject, "interfaceContractRef must point at an api-route interface contract")
    semantic_ref = record.get("semanticContractRef")
    if not _as_nonempty_string(semantic_ref) or semantic_ref not in semantic_contract_ids:
        F.add("USF-INTERFACE-002", subject, f"semanticContractRef does not resolve: {semantic_ref}")
    if instance.get("semanticContractRef") != semantic_ref:
        F.add("USF-INTERFACE-002", subject, "interface contract semanticContractRef does not match coverage record")
    route_id = route.get("routeId")
    operation_id = route.get("openapiOperationId")
    source_refs = set(_string_list(instance.get("sourceRefs")))
    if f"{API_ROUTE_INTERFACE_ROUTE_REF_PREFIX}{route_id}" not in source_refs:
        F.add("USF-INTERFACE-002", subject, "interface contract lacks api-surface routeId sourceRef")
    if f"{API_ROUTE_INTERFACE_OPENAPI_REF_PREFIX}{operation_id}" not in source_refs:
        F.add("USF-INTERFACE-002", subject, "interface contract lacks OpenAPI operation sourceRef")
    request_contract = instance.get("requestContract")
    response_contract = instance.get("responseContract")
    if not isinstance(request_contract, dict) or not isinstance(response_contract, dict):
        F.add("USF-INTERFACE-002", subject, "api-route interface contracts must carry requestContract and responseContract")
        return
    request_fields = set(_string_list(request_contract.get("fields")))
    response_fields = set(_string_list(response_contract.get("fields")))
    for required in (
        f"routeId:{route_id}",
        f"method:{route.get('method')}",
        f"path:{route.get('openapiPath')}",
        f"openapiOperationId:{operation_id}",
    ):
        if required not in request_fields:
            F.add("USF-INTERFACE-002", subject, f"requestContract missing {required}")
    if not any(field.startswith("responseSchema:") for field in response_fields):
        F.add("USF-INTERFACE-002", subject, "responseContract missing response schema field")
    for prefix in ("errorSchema:", "auditPolicy:", "pdpPolicy:", "proofEvidenceStatus:"):
        if not any(field.startswith(prefix) for field in response_fields):
            F.add("USF-INTERFACE-002", subject, f"responseContract missing {prefix}")


def validate_api_route_interface_coverage(F, data_by_path, api_route_records=None, route_interface_coverage=None):
    routes = api_route_records if isinstance(api_route_records, list) else _load_api_route_records(F)
    if not routes:
        return
    coverage = route_interface_coverage if isinstance(route_interface_coverage, dict) else _load_api_route_interface_coverage(F)
    if not isinstance(coverage, dict):
        return
    records = coverage.get("records")
    if not isinstance(records, list):
        F.add("USF-INTERFACE-001", API_ROUTE_INTERFACE_COVERAGE_PATH, "coverage records array is missing")
        return

    interface_instances = {}
    semantic_contract_ids = set()
    for path, data in data_by_path.items():
        if not isinstance(data, dict) or not isinstance(data.get("id"), str):
            continue
        schema = _schema_for_instance_path(path)
        if schema == "interface-contract":
            interface_instances[data["id"]] = data
        elif schema == "semantic-contract":
            semantic_contract_ids.add(data["id"])

    records_by_route = defaultdict(list)
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            F.add("USF-INTERFACE-002", f"{API_ROUTE_INTERFACE_COVERAGE_PATH}:records[{index}]", "coverage record must be an object")
            continue
        route_id = record.get("routeId")
        if not _as_nonempty_string(route_id):
            F.add("USF-INTERFACE-002", f"{API_ROUTE_INTERFACE_COVERAGE_PATH}:records[{index}]", "routeId is missing")
            continue
        records_by_route[route_id].append((index, record))

    route_ids = {_route_key(route) for route in routes}
    for route_id, rows in sorted(records_by_route.items()):
        if route_id not in route_ids:
            F.add("USF-INTERFACE-002", f"{API_ROUTE_INTERFACE_COVERAGE_PATH}:records[{rows[0][0]}]", f"coverage record targets unknown routeId {route_id}")
        if len(rows) > 1:
            F.add("USF-INTERFACE-002", route_id, "coverage record is duplicated")

    for route in routes:
        route_id = _route_key(route)
        claim = _route_openapi_authority_claim(route)
        if claim is not None:
            field, value = claim
            F.add("USF-INTERFACE-003", route_id, f"OpenAPI projection carries {field}={value}")
        rows = records_by_route.get(route_id, [])
        if len(rows) != 1:
            F.add("USF-INTERFACE-001", route_id, "implemented route lacks exactly one coverage disposition")
            continue
        index, record = rows[0]
        subject = f"{API_ROUTE_INTERFACE_COVERAGE_PATH}:records[{index}]"
        for field in ("method", "openapiPath", "openapiOperationId"):
            if record.get(field) != route.get(field):
                F.add("USF-INTERFACE-002", subject, f"{field} does not match implemented route")
        if record.get("openapiProjection") != API_ROUTE_INTERFACE_PROJECTION_ONLY:
            F.add("USF-INTERFACE-003", subject, "openapiProjection must remain projection-only")
        decision = record.get("decision")
        if decision not in API_ROUTE_INTERFACE_DECISIONS:
            F.add("USF-INTERFACE-002", subject, f"unsupported decision: {decision}")
            continue
        if decision == "interface-contract-instance":
            ref = record.get("interfaceContractRef")
            if not _as_nonempty_string(ref):
                F.add("USF-INTERFACE-001", subject, "interface-contract-instance decision lacks interfaceContractRef")
                continue
            _validate_route_interface_contract(
                F,
                subject,
                route,
                record,
                interface_instances.get(ref),
                semantic_contract_ids,
            )
        elif decision == "deferred":
            if not _as_nonempty_string(record.get("deferredRationale")):
                F.add("USF-INTERFACE-002", subject, "deferred decision requires a non-empty deferredRationale")
            if not re.fullmatch(r"USF-[0-9]+", str(record.get("followUpIssue") or "")):
                F.add("USF-INTERFACE-002", subject, "deferred decision requires a followUpIssue")
        elif decision == "rejected":
            if not _as_nonempty_string(record.get("rejectionRationale")):
                F.add("USF-INTERFACE-002", subject, "rejected decision requires a non-empty rejectionRationale")


def _load_non_ui_client_contract_map(F):
    data = load_json(NON_UI_CLIENT_CONTRACT_MAP_PATH, F)
    if data is None:
        F.add("USF-CLIENT-CONTRACT-001", NON_UI_CLIENT_CONTRACT_MAP_PATH, "client-contract map artefact is missing")
        return None
    if not isinstance(data, dict):
        F.add("USF-CLIENT-CONTRACT-001", NON_UI_CLIENT_CONTRACT_MAP_PATH, "client-contract map must be an object")
        return None
    return data


def _coverage_records_by_route(coverage):
    records_by_route = {}
    if not isinstance(coverage, dict):
        return records_by_route
    records = coverage.get("records")
    if not isinstance(records, list):
        return records_by_route
    for record in records:
        if isinstance(record, dict) and _as_nonempty_string(record.get("routeId")):
            records_by_route[record["routeId"]] = record
    return records_by_route


def _has_true_claim(value):
    return isinstance(value, dict) and any(v is True for v in value.values())


def _validate_string_field(F, subject, record, field, rule_id="USF-CLIENT-CONTRACT-002"):
    if not _as_nonempty_string(record.get(field)):
        F.add(rule_id, subject, f"{field} is missing")
        return False
    return True


def _validate_string_list_field(F, subject, record, field):
    values = record.get(field)
    if not isinstance(values, list) or not values or not all(_as_nonempty_string(value) for value in values):
        F.add("USF-CLIENT-CONTRACT-002", subject, f"{field} must be a non-empty string array")
        return False
    return True


def validate_non_ui_client_contract_map(F, data_by_path, api_route_records=None,
                                        route_interface_coverage=None, client_contract_map=None):
    routes = api_route_records if isinstance(api_route_records, list) else _load_api_route_records(F)
    if not routes:
        return
    coverage = route_interface_coverage if isinstance(route_interface_coverage, dict) else _load_api_route_interface_coverage(F)
    if not isinstance(coverage, dict):
        return
    client_map = client_contract_map if isinstance(client_contract_map, dict) else _load_non_ui_client_contract_map(F)
    if not isinstance(client_map, dict):
        return

    root_claims = client_map.get("readinessClaims")
    if _has_true_claim(root_claims):
        F.add("USF-CLIENT-CONTRACT-004", NON_UI_CLIENT_CONTRACT_MAP_PATH, "root readinessClaims must preserve non-claims")
    if client_map.get("generatedClientReadiness") is True or client_map.get("sdkReadiness") is True:
        F.add("USF-CLIENT-CONTRACT-004", NON_UI_CLIENT_CONTRACT_MAP_PATH, "generated client or SDK readiness must not be true")

    operations = client_map.get("operations")
    if not isinstance(operations, list):
        F.add("USF-CLIENT-CONTRACT-001", NON_UI_CLIENT_CONTRACT_MAP_PATH, "operations array is missing")
        return

    semantic_contract_ids = set()
    interface_contract_ids = set()
    for path, data in data_by_path.items():
        if not isinstance(data, dict) or not isinstance(data.get("id"), str):
            continue
        schema = _schema_for_instance_path(path)
        if schema == "semantic-contract":
            semantic_contract_ids.add(data["id"])
        elif schema == "interface-contract":
            interface_contract_ids.add(data["id"])

    coverage_by_route = _coverage_records_by_route(coverage)
    records_by_route = defaultdict(list)
    for index, record in enumerate(operations):
        subject = f"{NON_UI_CLIENT_CONTRACT_MAP_PATH}:operations[{index}]"
        if not isinstance(record, dict):
            F.add("USF-CLIENT-CONTRACT-002", subject, "operation record must be an object")
            continue
        route_id = record.get("routeId")
        if not _as_nonempty_string(route_id):
            F.add("USF-CLIENT-CONTRACT-001", subject, "routeId is missing")
            continue
        records_by_route[route_id].append((index, record))

    route_ids = {_route_key(route) for route in routes}
    for route_id, rows in sorted(records_by_route.items()):
        if route_id not in route_ids:
            F.add("USF-CLIENT-CONTRACT-001", f"{NON_UI_CLIENT_CONTRACT_MAP_PATH}:operations[{rows[0][0]}]", f"unknown routeId {route_id}")
        if len(rows) > 1:
            F.add("USF-CLIENT-CONTRACT-001", route_id, "client-contract operation record is duplicated")

    for route in routes:
        route_id = _route_key(route)
        rows = records_by_route.get(route_id, [])
        if len(rows) != 1:
            F.add("USF-CLIENT-CONTRACT-001", route_id, "implemented route lacks exactly one client-contract operation record")
            continue
        index, record = rows[0]
        subject = f"{NON_UI_CLIENT_CONTRACT_MAP_PATH}:operations[{index}]"
        coverage_record = coverage_by_route.get(route_id)
        if not isinstance(coverage_record, dict):
            F.add("USF-CLIENT-CONTRACT-001", subject, "route lacks interface disposition authority mapping")
            continue

        for field in ("method", "openapiPath", "openapiOperationId"):
            if record.get(field) != route.get(field):
                F.add("USF-CLIENT-CONTRACT-002", subject, f"{field} does not match implemented route")
        if record.get("sourceRouteRef") != f"{API_ROUTE_INTERFACE_ROUTE_REF_PREFIX}{route_id}":
            F.add("USF-CLIENT-CONTRACT-002", subject, "sourceRouteRef does not match implemented route")
        if record.get("interfaceDispositionRef") != f"{API_ROUTE_INTERFACE_COVERAGE_REF_PREFIX}{route_id}":
            F.add("USF-CLIENT-CONTRACT-002", subject, "interfaceDispositionRef does not point at the route map record")

        disposition = record.get("clientCallableDisposition")
        if disposition not in NON_UI_CLIENT_CONTRACT_DISPOSITIONS:
            F.add("USF-CLIENT-CONTRACT-002", subject, f"unsupported clientCallableDisposition: {disposition}")

        consumer_surfaces = record.get("consumerSurfaces")
        if (not isinstance(consumer_surfaces, list) or not consumer_surfaces
                or any(surface not in NON_UI_CLIENT_CONSUMER_SURFACES for surface in consumer_surfaces)):
            F.add("USF-CLIENT-CONTRACT-002", subject, "consumerSurfaces must use approved values")
        elif disposition in {"internal-support-only", "not-claimed"} and consumer_surfaces != ["none"]:
            F.add("USF-CLIENT-CONTRACT-004", subject, "internal or not-claimed operations must not expose client consumer surfaces")

        metadata = record.get("operationMetadata")
        if not isinstance(metadata, dict):
            F.add("USF-CLIENT-CONTRACT-002", subject, "operationMetadata is missing")
            metadata = {}
        for field in ("routeClassification", "owningDomain", "owningCapability", "authScheme",
                      "tenantScope", "dataClassification", "implementationRef"):
            _validate_string_field(F, subject, metadata, field)
        if metadata.get("routeClassification") != route.get("routeClassification"):
            F.add("USF-CLIENT-CONTRACT-002", subject, "routeClassification does not match implemented route")
        if metadata.get("owningCapability") != route.get("owningCapability"):
            F.add("USF-CLIENT-CONTRACT-002", subject, "owningCapability does not match implemented route")
        if _as_nonempty_string(route.get("authScheme")) and metadata.get("authScheme") != route.get("authScheme"):
            F.add("USF-CLIENT-CONTRACT-002", subject, "authScheme does not match implemented route")
        if metadata.get("tenantScope") != route.get("tenantScope"):
            F.add("USF-CLIENT-CONTRACT-002", subject, "tenantScope does not match implemented route")
        if metadata.get("implementationRef") != route.get("implementation"):
            F.add("USF-CLIENT-CONTRACT-002", subject, "implementationRef does not match implemented route")

        authority = record.get("authorityMapping")
        if not isinstance(authority, dict):
            F.add("USF-CLIENT-CONTRACT-001", subject, "authorityMapping is missing")
            authority = {}
        semantic_ref = authority.get("semanticContractRef")
        interface_ref = authority.get("interfaceContractRef")
        if semantic_ref != coverage_record.get("semanticContractRef") or semantic_ref not in semantic_contract_ids:
            F.add("USF-CLIENT-CONTRACT-001", subject, "semanticContractRef is missing or does not resolve")
        if interface_ref != coverage_record.get("interfaceContractRef") or interface_ref not in interface_contract_ids:
            F.add("USF-CLIENT-CONTRACT-001", subject, "interfaceContractRef is missing or does not resolve")
        for field in ("requestSemanticsRef", "responseSemanticsRef", "authScheme", "tenantScope",
                      "implementationRef", "proofEvidenceStatus"):
            _validate_string_field(F, subject, authority, field)
        for field in ("permissionRefs", "validationRefs", "errorRefs", "auditEventRefs", "telemetryRefs", "proofRefs"):
            _validate_string_list_field(F, subject, authority, field)

        generated = record.get("generatedClientInput")
        if not isinstance(generated, dict):
            F.add("USF-CLIENT-CONTRACT-003", subject, "generatedClientInput is missing")
            generated = {}
        status = generated.get("status")
        if status not in NON_UI_CLIENT_GENERATED_STATUSES:
            F.add("USF-CLIENT-CONTRACT-003", subject, f"unsupported generatedClientInput status: {status}")
        if generated.get("staleness") in {"stale", "unknown"} or generated.get("stale") is True:
            F.add("USF-CLIENT-CONTRACT-003", subject, "generated-client input is stale or unknown")

        readiness = record.get("readinessClaims")
        if not isinstance(readiness, dict):
            F.add("USF-CLIENT-CONTRACT-004", subject, "readinessClaims is missing")
            readiness = {}
        for field in NON_UI_CLIENT_READINESS_CLAIMS:
            if readiness.get(field) is True:
                F.add("USF-CLIENT-CONTRACT-004", subject, f"{field} must not be true")

        ui_policy = record.get("uiDerivedBehaviour")
        if not isinstance(ui_policy, dict):
            F.add("USF-CLIENT-CONTRACT-004", subject, "uiDerivedBehaviour policy is missing")
            ui_policy = {}
        if ui_policy.get("inventedBehaviourAllowed") is True or ui_policy.get("uiDerivedBehaviourAllowed") is True:
            F.add("USF-CLIENT-CONTRACT-004", subject, "UI-derived behaviour must not be allowed to define non-UI semantics")

        non_claims = set(_string_list(record.get("nonClaims")))
        missing_non_claims = sorted(NON_UI_CLIENT_REQUIRED_NONCLAIMS - non_claims)
        if missing_non_claims:
            F.add("USF-CLIENT-CONTRACT-004", subject, f"missing non-claims: {', '.join(missing_non_claims)}")


GENERATED_SDK_CLIENT_READINESS_MAP_PATH = "docs/architecture/generated-sdk-client-readiness-map.json"
GENERATED_SDK_CLIENT_PACKAGE_PATH = "packages/client/package.json"
GENERATED_SDK_CLIENT_VALIDATOR = "validate-spec.generated-sdk-client-readiness-map"
GENERATED_SDK_CLIENT_SCOPE = "bounded-current-main-contract-generation-input-and-sdk-operation-projection"
GENERATED_SDK_CLIENT_SOURCE_ANCHOR_PATHS = {
    "docs/architecture/non-ui-client-callable-contract-map.json",
    "docs/architecture/api-route-interface-contract-coverage.json",
    "docs/architecture/shared-client-sdk-semantic-surface.json",
    "docs/architecture/generated-client-contract-validation-semantics.json",
    "docs/architecture/app-surface-shared-client-consumption-path.json",
    "packages/client/package.json",
    "packages/client/src/index.ts",
    "packages/contracts/src/api-surface.ts",
    "packages/openapi/openapi.json",
}
GENERATED_SDK_CLIENT_SUPPORTED_DISPOSITIONS = {
    "client-callable-local-contract",
    "operator-tooling-local-contract",
}
GENERATED_SDK_CLIENT_EXPECTED_EXPOSURE = {
    "client-callable-local-contract": "generated-sdk-supported-local-contract",
    "operator-tooling-local-contract": "operator-tooling-sdk-supported-local-contract",
    "internal-support-only": "excluded-internal-support-only",
    "not-claimed": "excluded-not-authorised-for-generation",
}
GENERATED_SDK_CLIENT_REQUIRED_METADATA_FIELDS = {
    "authScheme",
    "tenantScope",
    "permissionRefs",
    "validationRefs",
    "errorRefs",
    "auditEventRefs",
    "telemetryRefs",
    "dataClassification",
    "requestSemanticsRef",
    "responseSemanticsRef",
    "proofRefs",
}
GENERATED_SDK_CLIENT_FORBIDDEN_TRUE_CLAIMS = {
    "packagePublicationReady",
    "productUiReady",
    "publicApiReady",
    "runtimeProductReady",
    "publicDeploymentReady",
    "publicFqdnReady",
    "deploymentReady",
    "stagingReady",
    "productionReady",
    "liveProviderReady",
    "complianceReady",
    "monetisationReady",
    "appStoreReady",
    "humanAcceptanceComplete",
}
GENERATED_SDK_CLIENT_REQUIRED_NONCLAIMS = {
    "no-package-publication-claim",
    "no-product-ui-readiness-claim",
    "no-public-api-readiness-claim",
    "no-runtime-product-readiness-upgrade",
    "no-public-fqdn-claim",
    "no-staging-claim",
    "no-production-claim",
    "no-deployment-claim",
    "no-live-provider-claim",
    "no-compliance-claim",
    "no-monetisation-claim",
    "no-app-store-claim",
    "no-human-acceptance-claim",
}
GENERATED_SDK_CLIENT_REQUIRED_PLANTED_RULES = {
    "USF-GENERATED-SDK-001",
    "USF-GENERATED-SDK-002",
    "USF-GENERATED-SDK-003",
    "USF-GENERATED-SDK-004",
}


def _load_generated_sdk_client_readiness_map(F):
    data = load_json(GENERATED_SDK_CLIENT_READINESS_MAP_PATH, F)
    if data is None:
        F.add("USF-GENERATED-SDK-001", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "generated SDK/client readiness map artefact is missing")
        return None
    if not isinstance(data, dict):
        F.add("USF-GENERATED-SDK-001", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "generated SDK/client readiness map must be an object")
        return None
    return data


def _client_operations_by_route_id(client_map):
    by_route = {}
    if not isinstance(client_map, dict):
        return by_route
    operations = client_map.get("operations")
    if not isinstance(operations, list):
        return by_route
    for operation in operations:
        if isinstance(operation, dict) and _as_nonempty_string(operation.get("routeId")):
            by_route[operation["routeId"]] = operation
    return by_route


def _current_blob_sha(path, current_blob_shas=None):
    if isinstance(current_blob_shas, dict) and path in current_blob_shas:
        value = current_blob_shas[path]
        return value if isinstance(value, str) else None
    try:
        return git_checked("hash-object", path)
    except Exception:
        return None


def _load_client_package_manifest(F, package_manifest=None):
    if isinstance(package_manifest, dict):
        return package_manifest
    data = load_json(GENERATED_SDK_CLIENT_PACKAGE_PATH, F)
    return data if isinstance(data, dict) else None


def _source_operation_has_projected_metadata(operation, field):
    metadata = operation.get("operationMetadata") if isinstance(operation, dict) else None
    authority = operation.get("authorityMapping") if isinstance(operation, dict) else None
    if not isinstance(metadata, dict):
        metadata = {}
    if not isinstance(authority, dict):
        authority = {}
    if field in {"authScheme", "tenantScope"}:
        return _as_nonempty_string(metadata.get(field)) and _as_nonempty_string(authority.get(field))
    if field == "dataClassification":
        return _as_nonempty_string(metadata.get("dataClassification"))
    if field in {"requestSemanticsRef", "responseSemanticsRef"}:
        return _as_nonempty_string(authority.get(field))
    if field in {"permissionRefs", "validationRefs", "errorRefs", "auditEventRefs", "telemetryRefs", "proofRefs"}:
        return bool(_string_list(authority.get(field)))
    return False


def validate_generated_sdk_client_readiness_map(F, client_contract_map=None, generated_readiness_map=None,
                                                current_blob_shas=None, package_manifest=None):
    client_map = client_contract_map if isinstance(client_contract_map, dict) else _load_non_ui_client_contract_map(F)
    if not isinstance(client_map, dict):
        return
    readiness_map = (generated_readiness_map if isinstance(generated_readiness_map, dict)
                     else _load_generated_sdk_client_readiness_map(F))
    if not isinstance(readiness_map, dict):
        return

    if readiness_map.get("readinessScope") != GENERATED_SDK_CLIENT_SCOPE:
        F.add("USF-GENERATED-SDK-004", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "readinessScope is missing or exceeds the bounded current-main SDK/client projection scope")
    if readiness_map.get("generatedOutputAuthority") != "lower-authority-projection-only":
        F.add("USF-GENERATED-SDK-004", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "generated outputs must remain lower-authority projections")

    claims = readiness_map.get("readinessClaims")
    if not isinstance(claims, dict):
        F.add("USF-GENERATED-SDK-003", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "readinessClaims is missing")
        claims = {}
    if claims.get("generatedClientReady") is not True or claims.get("sdkReady") is not True:
        F.add("USF-GENERATED-SDK-003", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "bounded generated-client and SDK readiness claims must both be explicitly true")
    for field in GENERATED_SDK_CLIENT_FORBIDDEN_TRUE_CLAIMS:
        if claims.get(field) is True:
            F.add("USF-GENERATED-SDK-004", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
                  f"{field} must not be true in the generated SDK/client readiness map")

    non_claims = set(_string_list(readiness_map.get("nonClaims")))
    missing_non_claims = sorted(GENERATED_SDK_CLIENT_REQUIRED_NONCLAIMS - non_claims)
    if missing_non_claims:
        F.add("USF-GENERATED-SDK-004", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              f"missing non-claims: {', '.join(missing_non_claims)}")

    anchors = readiness_map.get("sourceTreeAnchors")
    if not isinstance(anchors, list):
        F.add("USF-GENERATED-SDK-001", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "sourceTreeAnchors must be an array")
        anchors = []
    anchors_by_path = {}
    for index, anchor in enumerate(anchors):
        subject = f"{GENERATED_SDK_CLIENT_READINESS_MAP_PATH}:sourceTreeAnchors[{index}]"
        if not isinstance(anchor, dict):
            F.add("USF-GENERATED-SDK-001", subject, "source-tree anchor must be an object")
            continue
        path = anchor.get("path")
        blob_sha = anchor.get("blobSha")
        if not _as_nonempty_string(path) or not _as_nonempty_string(blob_sha):
            F.add("USF-GENERATED-SDK-001", subject, "source-tree anchor path and blobSha are required")
            continue
        if path in anchors_by_path:
            F.add("USF-GENERATED-SDK-001", subject, f"duplicate source-tree anchor for {path}")
        anchors_by_path[path] = blob_sha
    for path in sorted(GENERATED_SDK_CLIENT_SOURCE_ANCHOR_PATHS):
        blob_sha = anchors_by_path.get(path)
        current_blob = _current_blob_sha(path, current_blob_shas=current_blob_shas)
        if blob_sha is None:
            F.add("USF-GENERATED-SDK-001", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
                  f"missing source-tree anchor for {path}")
        elif current_blob != blob_sha:
            F.add("USF-GENERATED-SDK-001", path,
                  "source-tree anchor does not match current worktree blob")

    planted = readiness_map.get("plantedDefectCoverage")
    if not isinstance(planted, list):
        F.add("USF-GENERATED-SDK-003", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "plantedDefectCoverage must be an array")
    else:
        covered_rules = {item.get("ruleId") for item in planted if isinstance(item, dict)}
        missing_rules = sorted(GENERATED_SDK_CLIENT_REQUIRED_PLANTED_RULES - covered_rules)
        if missing_rules:
            F.add("USF-GENERATED-SDK-003", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
                  f"plantedDefectCoverage lacks rule coverage: {', '.join(missing_rules)}")

    validator_coverage = set(_string_list(readiness_map.get("validatorCoverage")))
    if GENERATED_SDK_CLIENT_VALIDATOR not in validator_coverage:
        F.add("USF-GENERATED-SDK-003", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "validatorCoverage lacks generated SDK/client readiness validator")

    package = readiness_map.get("packageReadiness")
    package_data = _load_client_package_manifest(F, package_manifest=package_manifest)
    if not isinstance(package, dict):
        F.add("USF-GENERATED-SDK-003", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "packageReadiness is missing")
        package = {}
    if isinstance(package_data, dict):
        if package.get("packageName") != package_data.get("name"):
            F.add("USF-GENERATED-SDK-003", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
                  "packageReadiness.packageName does not match packages/client/package.json")
        if package.get("versionFixture") != package_data.get("version"):
            F.add("USF-GENERATED-SDK-003", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
                  "packageReadiness.versionFixture does not match packages/client/package.json")
        if package.get("packagePrivate") is not True or package_data.get("private") is not True:
            F.add("USF-GENERATED-SDK-004", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
                  "client package must remain private while publication readiness is not claimed")
    if package.get("publicationReady") is True or package.get("npmPublicationClaim") is True:
        F.add("USF-GENERATED-SDK-004", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "package publication must remain explicitly not claimed")
    if package.get("publicationStatus") != "not-published-private-package-publication-not-claimed":
        F.add("USF-GENERATED-SDK-004", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "package publication status must be the explicit private non-claim")

    fixtures = readiness_map.get("fixturesAndExamples")
    if not isinstance(fixtures, dict):
        F.add("USF-GENERATED-SDK-003", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "fixturesAndExamples is missing")
    else:
        if fixtures.get("authorityDerivedFromCanonicalContracts") is not True:
            F.add("USF-GENERATED-SDK-003", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
                  "fixtures and examples must be marked as derived from canonical contracts")
        if not _string_list(fixtures.get("sourceRefs")):
            F.add("USF-GENERATED-SDK-003", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
                  "fixtures and examples require sourceRefs")

    metadata_projection = readiness_map.get("metadataProjection")
    if not isinstance(metadata_projection, dict):
        F.add("USF-GENERATED-SDK-003", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "metadataProjection is missing")
        metadata_projection = {}
    required_fields = set(_string_list(metadata_projection.get("requiredFields")))
    missing_metadata_fields = sorted(GENERATED_SDK_CLIENT_REQUIRED_METADATA_FIELDS - required_fields)
    if missing_metadata_fields:
        F.add("USF-GENERATED-SDK-003", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              f"metadataProjection lacks required fields: {', '.join(missing_metadata_fields)}")

    client_ops_by_route = _client_operations_by_route_id(client_map)
    operations = readiness_map.get("operations")
    if not isinstance(operations, list):
        F.add("USF-GENERATED-SDK-002", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "operations array is missing")
        return
    records_by_route = defaultdict(list)
    for index, operation in enumerate(operations):
        subject = f"{GENERATED_SDK_CLIENT_READINESS_MAP_PATH}:operations[{index}]"
        if not isinstance(operation, dict):
            F.add("USF-GENERATED-SDK-002", subject, "operation readiness record must be an object")
            continue
        route_id = operation.get("routeId")
        if not _as_nonempty_string(route_id):
            F.add("USF-GENERATED-SDK-002", subject, "routeId is missing")
            continue
        records_by_route[route_id].append((index, operation))

    expected_route_ids = set(client_ops_by_route)
    observed_route_ids = set(records_by_route)
    for route_id in sorted(observed_route_ids - expected_route_ids):
        F.add("USF-GENERATED-SDK-002", route_id, "generated SDK readiness record targets unknown routeId")
    for route_id in sorted(expected_route_ids - observed_route_ids):
        F.add("USF-GENERATED-SDK-002", route_id, "generated SDK readiness record is missing")
    for route_id, rows in sorted(records_by_route.items()):
        if len(rows) > 1:
            F.add("USF-GENERATED-SDK-002", route_id, "generated SDK readiness record is duplicated")

    supported_count = 0
    excluded_count = 0
    disposition_counts = {disposition: 0 for disposition in GENERATED_SDK_CLIENT_EXPECTED_EXPOSURE}
    for route_id, client_operation in sorted(client_ops_by_route.items()):
        rows = records_by_route.get(route_id, [])
        if len(rows) != 1:
            continue
        index, operation = rows[0]
        subject = f"{GENERATED_SDK_CLIENT_READINESS_MAP_PATH}:operations[{index}]"
        client_disposition = client_operation.get("clientCallableDisposition")
        generated = client_operation.get("generatedClientInput") if isinstance(client_operation, dict) else {}
        if not isinstance(generated, dict):
            generated = {}
        supported = (client_disposition in GENERATED_SDK_CLIENT_SUPPORTED_DISPOSITIONS
                     and generated.get("status") == "local-semantic-input-current"
                     and generated.get("staleness") == "current-main")
        if client_disposition in disposition_counts:
            disposition_counts[client_disposition] += 1
        expected_exposure = GENERATED_SDK_CLIENT_EXPECTED_EXPOSURE.get(client_disposition)
        if operation.get("clientContractRef") != f"{NON_UI_CLIENT_CONTRACT_MAP_PATH}#routeId={route_id}":
            F.add("USF-GENERATED-SDK-002", subject, "clientContractRef does not target the client-contract map route record")
        if operation.get("sourceMetadataRef") != f"{NON_UI_CLIENT_CONTRACT_MAP_PATH}#routeId={route_id}":
            F.add("USF-GENERATED-SDK-003", subject, "sourceMetadataRef does not target the client-contract map route record")
        if operation.get("sdkExposureDisposition") != expected_exposure:
            F.add("USF-GENERATED-SDK-002", subject,
                  f"sdkExposureDisposition does not match client disposition {client_disposition}")
        readiness = operation.get("readiness")
        if not isinstance(readiness, dict):
            F.add("USF-GENERATED-SDK-002", subject, "readiness is missing")
            readiness = {}
        projected_fields = set(_string_list(operation.get("projectedMetadataFields")))
        if not projected_fields and operation.get("metadataProjectionStatus") == "complete-from-client-contract-map":
            projected_fields = required_fields
        if supported:
            supported_count += 1
            if operation.get("generatedClientInputStatus") != "fresh-current-main":
                F.add("USF-GENERATED-SDK-001", subject, "supported operation must use fresh-current-main generated-client input")
            if readiness.get("generatedClientReady") is not True or readiness.get("sdkOperationReady") is not True:
                F.add("USF-GENERATED-SDK-002", subject, "supported operation must be generated-client and SDK ready")
            if operation.get("metadataProjectionStatus") != "complete-from-client-contract-map":
                F.add("USF-GENERATED-SDK-003", subject, "supported operation lacks complete metadata projection status")
            missing_fields = sorted(required_fields - projected_fields)
            if missing_fields:
                F.add("USF-GENERATED-SDK-003", subject,
                      f"projectedMetadataFields lacks required fields: {', '.join(missing_fields)}")
            for field in required_fields:
                if not _source_operation_has_projected_metadata(client_operation, field):
                    F.add("USF-GENERATED-SDK-003", subject,
                          f"client-contract source lacks projected metadata field: {field}")
        else:
            excluded_count += 1
            if operation.get("generatedClientInputStatus") != "not-authorised-for-generation":
                F.add("USF-GENERATED-SDK-002", subject,
                      "excluded operation must remain not-authorised-for-generation")
            if readiness.get("generatedClientReady") is True or readiness.get("sdkOperationReady") is True:
                F.add("USF-GENERATED-SDK-004", subject, "excluded operation must not be SDK or generated-client ready")
            if not _as_nonempty_string(operation.get("exclusionRationale")):
                F.add("USF-GENERATED-SDK-002", subject, "excluded operation requires an exclusionRationale")

    coverage = readiness_map.get("operationCoverage")
    if not isinstance(coverage, dict):
        F.add("USF-GENERATED-SDK-002", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
              "operationCoverage is missing")
    else:
        expected_counts = {
            "totalOperations": len(client_ops_by_route),
            "sdkSupportedOperations": supported_count,
            "sdkExcludedOperations": excluded_count,
            "clientCallableLocalContractOperations": disposition_counts["client-callable-local-contract"],
            "operatorToolingLocalContractOperations": disposition_counts["operator-tooling-local-contract"],
            "internalSupportOnlyOperations": disposition_counts["internal-support-only"],
            "notClaimedOperations": disposition_counts["not-claimed"],
        }
        for field, expected in expected_counts.items():
            if coverage.get(field) != expected:
                F.add("USF-GENERATED-SDK-002", GENERATED_SDK_CLIENT_READINESS_MAP_PATH,
                      f"operationCoverage.{field} must be {expected}")


OPENAPI_DOCUMENT_PATH = "packages/openapi/openapi.json"
PUBLIC_API_READINESS_MAP_PATH = "docs/architecture/public-api-readiness-map.json"
PUBLIC_API_READINESS_VALIDATOR = "validate-spec.public-api-readiness-map"
PUBLIC_API_OPENAPI_CHECK_COMMAND = "openapi:check"
PUBLIC_API_READINESS_SCOPE = "bounded-current-main-public-api-contract-readiness"
PUBLIC_API_SOURCE_ANCHOR_PATHS = {
    API_ROUTE_INTERFACE_COVERAGE_PATH,
    NON_UI_CLIENT_CONTRACT_MAP_PATH,
    "packages/contracts/src/api-surface.ts",
    OPENAPI_DOCUMENT_PATH,
    "packages/openapi/src/check.ts",
}
PUBLIC_API_EXPECTED_EXPOSURE = {
    "client-callable-local-contract": "public-consumer-contract-ready",
    "operator-tooling-local-contract": "operator-tooling-contract-not-public-consumer",
    "internal-support-only": "internal-support-only-not-public-consumer",
    "not-claimed": "support-route-not-public-api-consumer",
}
PUBLIC_API_PUBLIC_READY_DISPOSITIONS = {"client-callable-local-contract"}
PUBLIC_API_REQUIRED_TRUE_CLAIMS = {
    "publicApiReady",
    "publicApiContractReady",
    "publicApiDocumentationReady",
}
PUBLIC_API_FORBIDDEN_TRUE_CLAIMS = {
    "publicDeploymentReady",
    "publicFqdnReady",
    "deploymentReady",
    "stagingReady",
    "productionReady",
    "liveProviderReady",
    "productUiReady",
    "packagePublicationReady",
    "complianceReady",
    "monetisationReady",
    "appStoreReady",
    "humanAcceptanceComplete",
}
PUBLIC_API_REQUIRED_NONCLAIMS = {
    "no-public-deployment-claim",
    "no-public-fqdn-claim",
    "no-staging-claim",
    "no-production-claim",
    "no-live-provider-claim",
    "no-compliance-claim",
    "no-monetisation-claim",
    "no-app-store-claim",
    "no-human-acceptance-claim",
}
PUBLIC_API_ROOT_REQUIRED_NONCLAIMS = PUBLIC_API_REQUIRED_NONCLAIMS | {
    "no-generated-report-authority-claim",
}
PUBLIC_API_REQUIRED_SECURITY_FIELDS = {
    "authScheme",
    "tenantScope",
    "permissionRefs",
    "requestSemanticsRef",
    "responseSemanticsRef",
    "errorRefs",
    "rateLimitPolicy",
    "corsPolicy",
    "csrfPolicy",
    "securityHeadersPolicy",
    "fieldExposurePolicy",
    "auditEventRefs",
    "telemetryRefs",
    "correlationPolicy",
    "observabilityPolicy",
    "gatewayPolicy",
}
PUBLIC_API_REQUIRED_DOC_REFS = {
    OPENAPI_DOCUMENT_PATH,
    "packages/openapi/src/check.ts",
    "packages/contracts/src/api-surface.ts",
}
PUBLIC_API_REQUIRED_PLANTED_RULES = {
    "USF-PUBLIC-API-001",
    "USF-PUBLIC-API-002",
    "USF-PUBLIC-API-003",
    "USF-PUBLIC-API-004",
}


def _load_openapi_document(F, openapi_document=None):
    if isinstance(openapi_document, dict):
        return openapi_document
    data = load_json(OPENAPI_DOCUMENT_PATH, F)
    return data if isinstance(data, dict) else None


def _load_public_api_readiness_map(F):
    data = load_json(PUBLIC_API_READINESS_MAP_PATH, F)
    if data is None:
        F.add("USF-PUBLIC-API-001", PUBLIC_API_READINESS_MAP_PATH,
              "public API readiness map artefact is missing")
        return None
    if not isinstance(data, dict):
        F.add("USF-PUBLIC-API-001", PUBLIC_API_READINESS_MAP_PATH,
              "public API readiness map must be an object")
        return None
    return data


def _openapi_operations_by_route_id(openapi_document):
    by_route = {}
    if not isinstance(openapi_document, dict):
        return by_route
    paths = openapi_document.get("paths")
    if not isinstance(paths, dict):
        return by_route
    for path, methods in paths.items():
        if not isinstance(methods, dict):
            continue
        for method, operation in methods.items():
            if method.lower() not in {"get", "post", "put", "patch", "delete"}:
                continue
            if not isinstance(operation, dict):
                continue
            metadata = operation.get("x-usf-route")
            if not isinstance(metadata, dict):
                continue
            route_id = metadata.get("routeId")
            if _as_nonempty_string(route_id):
                by_route[route_id] = {
                    "method": method.upper(),
                    "openapiPath": path,
                    "openapiOperationId": operation.get("operationId"),
                    "operation": operation,
                    "metadata": metadata,
                }
    return by_route


def _client_authority_value(client_operation, field):
    metadata = client_operation.get("operationMetadata") if isinstance(client_operation, dict) else {}
    authority = client_operation.get("authorityMapping") if isinstance(client_operation, dict) else {}
    if not isinstance(metadata, dict):
        metadata = {}
    if not isinstance(authority, dict):
        authority = {}
    if field in {"authScheme", "tenantScope"}:
        return authority.get(field) or metadata.get(field)
    if field in {"permissionRefs", "requestSemanticsRef", "responseSemanticsRef",
                 "errorRefs", "auditEventRefs", "telemetryRefs"}:
        return authority.get(field)
    return None


def _public_api_source_security_value(client_operation, openapi_record, field):
    client_value = _client_authority_value(client_operation, field)
    if client_value is not None:
        return client_value
    metadata = openapi_record.get("metadata") if isinstance(openapi_record, dict) else {}
    if not isinstance(metadata, dict):
        metadata = {}
    return metadata.get(field)


def _values_match(expected, observed):
    if isinstance(expected, list):
        return observed == expected
    return expected == observed


def _public_api_count_by_metadata(openapi_ops_by_route, field):
    counts = Counter()
    for openapi_record in openapi_ops_by_route.values():
        metadata = openapi_record.get("metadata")
        if not isinstance(metadata, dict):
            continue
        value = metadata.get(field)
        if _as_nonempty_string(value):
            counts[value] += 1
    return dict(sorted(counts.items()))


def _public_api_claims_are_bounded(F, claims):
    if not isinstance(claims, dict):
        F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
              "readinessClaims is missing")
        return
    for field in sorted(PUBLIC_API_REQUIRED_TRUE_CLAIMS):
        if claims.get(field) is not True:
            F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
                  f"{field} must be true for bounded public API contract readiness")
    for field in sorted(PUBLIC_API_FORBIDDEN_TRUE_CLAIMS):
        if claims.get(field) is True:
            F.add("USF-PUBLIC-API-004", PUBLIC_API_READINESS_MAP_PATH,
                  f"{field} must not be true in the public API readiness map")


def validate_public_api_readiness_map(F, client_contract_map=None, public_api_readiness_map=None,
                                      current_blob_shas=None, openapi_document=None):
    client_map = client_contract_map if isinstance(client_contract_map, dict) else _load_non_ui_client_contract_map(F)
    openapi_doc = _load_openapi_document(F, openapi_document=openapi_document)
    readiness_map = (public_api_readiness_map if isinstance(public_api_readiness_map, dict)
                     else _load_public_api_readiness_map(F))
    if not isinstance(client_map, dict) or not isinstance(openapi_doc, dict) or not isinstance(readiness_map, dict):
        return

    if readiness_map.get("readinessScope") != PUBLIC_API_READINESS_SCOPE:
        F.add("USF-PUBLIC-API-004", PUBLIC_API_READINESS_MAP_PATH,
              "readinessScope is missing or exceeds bounded current-main public API contract readiness")
    if readiness_map.get("authorityLevel") != "validator-enforced-readiness-map":
        F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
              "authorityLevel must identify a validator-enforced readiness map")

    _public_api_claims_are_bounded(F, readiness_map.get("readinessClaims"))
    non_claims = set(_string_list(readiness_map.get("nonClaims")))
    missing_non_claims = sorted(PUBLIC_API_ROOT_REQUIRED_NONCLAIMS - non_claims)
    if missing_non_claims:
        F.add("USF-PUBLIC-API-004", PUBLIC_API_READINESS_MAP_PATH,
              f"missing non-claims: {', '.join(missing_non_claims)}")

    anchors = readiness_map.get("sourceTreeAnchors")
    if not isinstance(anchors, list):
        F.add("USF-PUBLIC-API-001", PUBLIC_API_READINESS_MAP_PATH,
              "sourceTreeAnchors must be an array")
        anchors = []
    anchors_by_path = {}
    for index, anchor in enumerate(anchors):
        subject = f"{PUBLIC_API_READINESS_MAP_PATH}:sourceTreeAnchors[{index}]"
        if not isinstance(anchor, dict):
            F.add("USF-PUBLIC-API-001", subject, "source-tree anchor must be an object")
            continue
        path = anchor.get("path")
        blob_sha = anchor.get("blobSha")
        if not _as_nonempty_string(path) or not _as_nonempty_string(blob_sha):
            F.add("USF-PUBLIC-API-001", subject, "source-tree anchor path and blobSha are required")
            continue
        if path in anchors_by_path:
            F.add("USF-PUBLIC-API-001", subject, f"duplicate source-tree anchor for {path}")
        anchors_by_path[path] = blob_sha
    for path in sorted(PUBLIC_API_SOURCE_ANCHOR_PATHS):
        blob_sha = anchors_by_path.get(path)
        current_blob = _current_blob_sha(path, current_blob_shas=current_blob_shas)
        if blob_sha is None:
            F.add("USF-PUBLIC-API-001", PUBLIC_API_READINESS_MAP_PATH,
                  f"missing source-tree anchor for {path}")
        elif current_blob != blob_sha:
            F.add("USF-PUBLIC-API-001", path,
                  "source-tree anchor does not match current worktree blob")

    validator_coverage = set(_string_list(readiness_map.get("validatorCoverage")))
    if PUBLIC_API_READINESS_VALIDATOR not in validator_coverage:
        F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
              "validatorCoverage lacks public API readiness validator")
    if PUBLIC_API_OPENAPI_CHECK_COMMAND not in validator_coverage:
        F.add("USF-PUBLIC-API-001", PUBLIC_API_READINESS_MAP_PATH,
              "validatorCoverage lacks OpenAPI drift hard gate")

    planted = readiness_map.get("plantedDefectCoverage")
    if not isinstance(planted, list):
        F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
              "plantedDefectCoverage must be an array")
    else:
        covered_rules = {item.get("ruleId") for item in planted if isinstance(item, dict)}
        missing_rules = sorted(PUBLIC_API_REQUIRED_PLANTED_RULES - covered_rules)
        if missing_rules:
            F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
                  f"plantedDefectCoverage lacks rule coverage: {', '.join(missing_rules)}")

    boundary = openapi_doc.get("x-usf-boundary")
    if not isinstance(boundary, dict):
        F.add("USF-PUBLIC-API-001", OPENAPI_DOCUMENT_PATH, "OpenAPI x-usf-boundary is missing")
        boundary = {}
    if boundary.get("routeContractSource") != "packages/contracts/src/api-surface.ts":
        F.add("USF-PUBLIC-API-001", OPENAPI_DOCUMENT_PATH,
              "OpenAPI boundary must name the canonical route contract source")
    for field in ("publicApiReadinessClaim", "productionReadinessClaim", "externalSdkReadinessClaim"):
        if boundary.get(field) is not False:
            F.add("USF-PUBLIC-API-004", OPENAPI_DOCUMENT_PATH,
                  f"OpenAPI projection boundary must keep {field} false")

    projection = readiness_map.get("openapiProjectionBoundary")
    if not isinstance(projection, dict):
        F.add("USF-PUBLIC-API-001", PUBLIC_API_READINESS_MAP_PATH,
              "openapiProjectionBoundary is missing")
        projection = {}
    expected_projection = {
        "projectionOnly": True,
        "openapiCheckCommand": PUBLIC_API_OPENAPI_CHECK_COMMAND,
        "openapiBoundaryRef": f"{OPENAPI_DOCUMENT_PATH}#x-usf-boundary",
        "openapiPublicApiReadinessClaim": False,
        "openapiProductionReadinessClaim": False,
        "openapiExternalSdkReadinessClaim": False,
    }
    for field, expected in expected_projection.items():
        if projection.get(field) != expected:
            F.add("USF-PUBLIC-API-001", PUBLIC_API_READINESS_MAP_PATH,
                  f"openapiProjectionBoundary.{field} must be {expected}")

    versioning = readiness_map.get("versioningCompatibilityAndDocs")
    if not isinstance(versioning, dict):
        F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
              "versioningCompatibilityAndDocs is missing")
        versioning = {}
    if versioning.get("publicDocumentationGeneratedFromAuthority") is not True:
        F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
              "public documentation must be generated from repository authority")
    if versioning.get("publicDocumentationPublished") is True:
        F.add("USF-PUBLIC-API-004", PUBLIC_API_READINESS_MAP_PATH,
              "public documentation publication must not be claimed")
    missing_doc_refs = sorted(PUBLIC_API_REQUIRED_DOC_REFS - set(_string_list(versioning.get("documentationSourceRefs"))))
    if missing_doc_refs:
        F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
              f"documentationSourceRefs lacks: {', '.join(missing_doc_refs)}")
    if not _as_nonempty_string(versioning.get("deprecationPolicy")):
        F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
              "deprecationPolicy is missing")
    if versioning.get("compatibilityPolicySource") != "packages/contracts/src/api-surface.ts#compatibilityPolicy":
        F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
              "compatibilityPolicySource must point at the canonical API surface")

    security = readiness_map.get("consumerSecurityAndTelemetry")
    if not isinstance(security, dict):
        F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
              "consumerSecurityAndTelemetry is missing")
        security = {}
    required_fields = set(_string_list(security.get("requiredFields")))
    missing_security_fields = sorted(PUBLIC_API_REQUIRED_SECURITY_FIELDS - required_fields)
    if missing_security_fields:
        F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
              f"consumerSecurityAndTelemetry lacks required fields: {', '.join(missing_security_fields)}")
    if security.get("missingSemanticsFailClosed") is not True:
        F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
              "missing security and telemetry semantics must fail closed")

    client_ops_by_route = _client_operations_by_route_id(client_map)
    openapi_ops_by_route = _openapi_operations_by_route_id(openapi_doc)
    operations = readiness_map.get("operations")
    if not isinstance(operations, list):
        F.add("USF-PUBLIC-API-002", PUBLIC_API_READINESS_MAP_PATH,
              "operations array is missing")
        return
    records_by_route = defaultdict(list)
    for index, operation in enumerate(operations):
        subject = f"{PUBLIC_API_READINESS_MAP_PATH}:operations[{index}]"
        if not isinstance(operation, dict):
            F.add("USF-PUBLIC-API-002", subject, "operation readiness record must be an object")
            continue
        route_id = operation.get("routeId")
        if not _as_nonempty_string(route_id):
            F.add("USF-PUBLIC-API-002", subject, "routeId is missing")
            continue
        records_by_route[route_id].append((index, operation))

    expected_route_ids = set(client_ops_by_route) | set(openapi_ops_by_route)
    observed_route_ids = set(records_by_route)
    for route_id in sorted(observed_route_ids - expected_route_ids):
        F.add("USF-PUBLIC-API-002", route_id, "public API readiness record targets unknown routeId")
    for route_id in sorted(expected_route_ids - observed_route_ids):
        F.add("USF-PUBLIC-API-002", route_id, "public API readiness record is missing")
    for route_id, rows in sorted(records_by_route.items()):
        if len(rows) > 1:
            F.add("USF-PUBLIC-API-002", route_id, "public API readiness record is duplicated")
    if set(client_ops_by_route) != set(openapi_ops_by_route):
        F.add("USF-PUBLIC-API-002", PUBLIC_API_READINESS_MAP_PATH,
              "client-contract and OpenAPI route sets must match before public API readiness can be claimed")

    expected_counts = {
        "totalOperations": len(client_ops_by_route),
        "publicConsumerReadyOperations": 0,
        "operatorToolingNotPublicConsumerOperations": 0,
        "internalSupportOnlyOperations": 0,
        "supportRouteNotClaimedOperations": 0,
        "clientCallableLocalContractOperations": 0,
        "operatorToolingLocalContractOperations": 0,
        "internalSupportOnlyDispositionOperations": 0,
        "notClaimedDispositionOperations": 0,
    }

    for route_id, client_operation in sorted(client_ops_by_route.items()):
        openapi_record = openapi_ops_by_route.get(route_id)
        rows = records_by_route.get(route_id, [])
        if not isinstance(openapi_record, dict) or len(rows) != 1:
            continue
        index, operation = rows[0]
        subject = f"{PUBLIC_API_READINESS_MAP_PATH}:operations[{index}]"
        openapi_metadata = openapi_record.get("metadata") if isinstance(openapi_record, dict) else {}
        if not isinstance(openapi_metadata, dict):
            openapi_metadata = {}
        client_disposition = client_operation.get("clientCallableDisposition")
        if client_disposition == "client-callable-local-contract":
            expected_counts["clientCallableLocalContractOperations"] += 1
            expected_counts["publicConsumerReadyOperations"] += 1
        elif client_disposition == "operator-tooling-local-contract":
            expected_counts["operatorToolingLocalContractOperations"] += 1
            expected_counts["operatorToolingNotPublicConsumerOperations"] += 1
        elif client_disposition == "internal-support-only":
            expected_counts["internalSupportOnlyDispositionOperations"] += 1
            expected_counts["internalSupportOnlyOperations"] += 1
        elif client_disposition == "not-claimed":
            expected_counts["notClaimedDispositionOperations"] += 1
            expected_counts["supportRouteNotClaimedOperations"] += 1

        expected_exposure = PUBLIC_API_EXPECTED_EXPOSURE.get(client_disposition)
        if operation.get("publicApiExposureDisposition") != expected_exposure:
            F.add("USF-PUBLIC-API-002", subject,
                  f"publicApiExposureDisposition does not match client disposition {client_disposition}")
        for field, expected in (
            ("method", openapi_record.get("method")),
            ("openapiPath", openapi_record.get("openapiPath")),
            ("openapiOperationId", openapi_record.get("openapiOperationId")),
        ):
            if operation.get(field) != expected:
                F.add("USF-PUBLIC-API-002", subject, f"{field} does not match OpenAPI projection")
        if operation.get("interfaceDispositionRef") != f"{API_ROUTE_INTERFACE_COVERAGE_REF_PREFIX}{route_id}":
            F.add("USF-PUBLIC-API-002", subject,
                  "interfaceDispositionRef does not target the route interface coverage record")
        if operation.get("clientContractRef") != f"{NON_UI_CLIENT_CONTRACT_MAP_PATH}#routeId={route_id}":
            F.add("USF-PUBLIC-API-002", subject,
                  "clientContractRef does not target the client-contract map route record")
        if operation.get("openapiOperationRef") != f"{OPENAPI_DOCUMENT_PATH}#operationId={openapi_record.get('openapiOperationId')}":
            F.add("USF-PUBLIC-API-001", subject,
                  "openapiOperationRef does not target the projected OpenAPI operation")

        readiness = operation.get("readiness")
        if not isinstance(readiness, dict):
            F.add("USF-PUBLIC-API-002", subject, "readiness is missing")
            readiness = {}
        public_ready = client_disposition in PUBLIC_API_PUBLIC_READY_DISPOSITIONS
        if public_ready:
            if (readiness.get("publicConsumerOperationReady") is not True
                    or readiness.get("publicApiContractReady") is not True):
                F.add("USF-PUBLIC-API-002", subject,
                      "public consumer operations must carry bounded contract readiness")
        else:
            if (readiness.get("publicConsumerOperationReady") is True
                    or readiness.get("publicApiContractReady") is True):
                F.add("USF-PUBLIC-API-004", subject,
                      "non-public-consumer operations must not claim public API operation readiness")
        if readiness.get("publicDeploymentReady") is True or readiness.get("liveProviderReady") is True:
            F.add("USF-PUBLIC-API-004", subject,
                  "operation readiness must not claim public deployment or live-provider readiness")

        version = operation.get("versioning")
        if not isinstance(version, dict):
            F.add("USF-PUBLIC-API-003", subject, "versioning is missing")
            version = {}
        expected_deprecation = "deprecated" if openapi_record.get("operation", {}).get("deprecated") is True else "active"
        for field, expected in (
            ("apiVersion", openapi_metadata.get("apiVersion")),
            ("contractVersion", openapi_metadata.get("contractVersion")),
            ("operationVersion", openapi_metadata.get("operationVersion")),
            ("lifecycle", openapi_metadata.get("lifecycle")),
            ("compatibilityPolicy", openapi_metadata.get("compatibilityPolicy")),
            ("deprecationStatus", expected_deprecation),
        ):
            if version.get(field) != expected:
                F.add("USF-PUBLIC-API-003", subject, f"versioning.{field} does not match canonical route metadata")

        consumer_security = operation.get("consumerSecurity")
        if not isinstance(consumer_security, dict):
            F.add("USF-PUBLIC-API-003", subject, "consumerSecurity is missing")
            consumer_security = {}
        for field in sorted(PUBLIC_API_REQUIRED_SECURITY_FIELDS):
            expected = _public_api_source_security_value(client_operation, openapi_record, field)
            observed = consumer_security.get(field)
            if isinstance(expected, list):
                if not _string_list(observed) or not _values_match(expected, observed):
                    F.add("USF-PUBLIC-API-003", subject,
                          f"consumerSecurity.{field} is missing or does not match source authority")
            else:
                if not _as_nonempty_string(observed) or (_as_nonempty_string(expected) and observed != expected):
                    F.add("USF-PUBLIC-API-003", subject,
                          f"consumerSecurity.{field} is missing or does not match source authority")

        operation_projection = operation.get("openapiProjection")
        if not isinstance(operation_projection, dict):
            F.add("USF-PUBLIC-API-001", subject, "openapiProjection is missing")
            operation_projection = {}
        if operation_projection.get("projectionOnly") is not True:
            F.add("USF-PUBLIC-API-004", subject, "OpenAPI operation metadata must remain projection-only")
        if operation_projection.get("sourceOfTruth") != "packages/contracts/src/api-surface.ts":
            F.add("USF-PUBLIC-API-001", subject, "OpenAPI projection sourceOfTruth must be the canonical API surface")
        if operation_projection.get("operationMetadataSource") != "x-usf-route":
            F.add("USF-PUBLIC-API-001", subject, "OpenAPI operation metadata source must be x-usf-route")
        if operation_projection.get("operationFreshnessCommand") != PUBLIC_API_OPENAPI_CHECK_COMMAND:
            F.add("USF-PUBLIC-API-001", subject, "OpenAPI operation freshness command must be openapi:check")

        missing_operation_nonclaims = sorted(PUBLIC_API_REQUIRED_NONCLAIMS - set(_string_list(operation.get("nonClaims"))))
        if missing_operation_nonclaims:
            F.add("USF-PUBLIC-API-004", subject,
                  f"operation nonClaims lacks: {', '.join(missing_operation_nonclaims)}")

    coverage = readiness_map.get("operationCoverage")
    if not isinstance(coverage, dict):
        F.add("USF-PUBLIC-API-002", PUBLIC_API_READINESS_MAP_PATH,
              "operationCoverage is missing")
    else:
        for field, expected in expected_counts.items():
            if coverage.get(field) != expected:
                F.add("USF-PUBLIC-API-002", PUBLIC_API_READINESS_MAP_PATH,
                      f"operationCoverage.{field} must be {expected}")

    for field, expected in (
        ("apiVersionCounts", _public_api_count_by_metadata(openapi_ops_by_route, "apiVersion")),
        ("lifecycleCounts", _public_api_count_by_metadata(openapi_ops_by_route, "lifecycle")),
        ("routeClassificationCounts", _public_api_count_by_metadata(openapi_ops_by_route, "routeClassification")),
    ):
        if versioning.get(field) != expected:
            F.add("USF-PUBLIC-API-003", PUBLIC_API_READINESS_MAP_PATH,
                  f"versioningCompatibilityAndDocs.{field} must match OpenAPI route metadata")


CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH = "docs/architecture/current-main-capability-service-realisation-map.json"
CAPABILITY_REALISATION_REQUIRED_VALIDATOR = "validate-spec.current-main-capability-service-realisation-map"
CAPABILITY_REALISATION_CLIENT_VALIDATOR = "validate-spec.non-ui-client-contract-map"
CAPABILITY_REALISATION_DISPOSITIONS = {
    "local-route-contract-realised",
    "operator-tooling-local-contract",
    "internal-support-only",
    "not-claimed",
    "semantic-contract-only-current-main",
    "deferred-with-rationale",
    "deprecated-with-rationale",
}
CAPABILITY_REALISATION_PROOF_STATUSES = {
    "bounded-local-dev-test-evidence-only",
    "semantic-definition-only-no-current-runtime-proof-claim",
    "not-claimed",
    "deferred-no-current-proof-claim",
    "deprecated-lineage-only",
}
CAPABILITY_REALISATION_REQUIRED_NONCLAIMS = {
    "no-generated-sdk-readiness-claim",
    "no-generated-client-readiness-claim",
    "no-product-ui-readiness-claim",
    "no-public-api-readiness-claim",
    "no-runtime-product-readiness-upgrade",
    "no-staging-claim",
    "no-production-claim",
    "no-deployment-claim",
    "no-live-provider-claim",
    "no-human-acceptance-claim",
}
CAPABILITY_REALISATION_READINESS_CLAIMS = NON_UI_CLIENT_READINESS_CLAIMS | {
    "runtimeProductReady",
    "complianceReady",
    "monetisationReady",
}
CAPABILITY_REALISATION_REQUIRED_PLANTED_RULES = {
    "USF-CAPABILITY-REALISATION-001",
    "USF-CAPABILITY-REALISATION-002",
    "USF-CAPABILITY-REALISATION-003",
    "USF-CAPABILITY-REALISATION-004",
}


def _load_current_main_capability_realisation_map(F):
    data = load_json(CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH, F)
    if data is None:
        F.add("USF-CAPABILITY-REALISATION-001", CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH,
              "capability-service realisation map artefact is missing")
        return None
    if not isinstance(data, dict):
        F.add("USF-CAPABILITY-REALISATION-001", CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH,
              "capability-service realisation map must be an object")
        return None
    return data


def _semantic_contract_records(data_by_path):
    records = {}
    paths = {}
    for path, data in data_by_path.items():
        if _schema_for_instance_path(path) != "semantic-contract":
            continue
        if isinstance(data, dict) and _as_nonempty_string(data.get("id")):
            records[data["id"]] = data
            paths[data["id"]] = path
    return records, paths


def _client_operations_by_semantic(client_map):
    by_semantic = defaultdict(list)
    if not isinstance(client_map, dict):
        return by_semantic
    operations = client_map.get("operations")
    if not isinstance(operations, list):
        return by_semantic
    for operation in operations:
        if not isinstance(operation, dict):
            continue
        authority = operation.get("authorityMapping")
        if not isinstance(authority, dict):
            continue
        semantic_ref = authority.get("semanticContractRef")
        if _as_nonempty_string(semantic_ref):
            by_semantic[semantic_ref].append(operation)
    return by_semantic


def _route_ids(operations):
    route_ids = []
    for operation in operations:
        route_id = operation.get("routeId") if isinstance(operation, dict) else None
        if _as_nonempty_string(route_id):
            route_ids.append(route_id)
    return sorted(route_ids)


def _traceability_route_ids(row):
    values = []
    traceability = row.get("routeTraceability")
    if not isinstance(traceability, list):
        return values
    for item in traceability:
        if isinstance(item, dict) and _as_nonempty_string(item.get("routeId")):
            values.append(item["routeId"])
    return sorted(values)


def _has_generated_report_authority_overclaim(values):
    if not isinstance(values, list):
        return False
    for value in values:
        if not isinstance(value, str):
            continue
        lowered = value.lower()
        if lowered.startswith("generated-report:") or "generated report authority" in lowered:
            return True
    return False


def validate_current_main_capability_realisation_map(F, data_by_path, client_contract_map=None,
                                                     capability_realisation_map=None):
    semantic_records, semantic_paths = _semantic_contract_records(data_by_path)
    if not semantic_records:
        return
    client_map = client_contract_map if isinstance(client_contract_map, dict) else _load_non_ui_client_contract_map(F)
    capability_map = (capability_realisation_map if isinstance(capability_realisation_map, dict)
                      else _load_current_main_capability_realisation_map(F))
    if not isinstance(capability_map, dict):
        return

    if capability_map.get("generatedReportAuthority") != "lower-authority-summary-only":
        F.add("USF-CAPABILITY-REALISATION-004", CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH,
              "generated reports must remain lower-authority summaries")
    root_freshness = capability_map.get("currentMainFreshness")
    if not isinstance(root_freshness, dict) or root_freshness.get("status") != "current-main":
        F.add("USF-CAPABILITY-REALISATION-003", CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH,
              "root currentMainFreshness must be current-main")
    elif (root_freshness.get("historicalEvidenceTreatment") != "lineage-only-not-current-proof"
          or root_freshness.get("generatedReportAuthority") != "lower-authority-summary-only"):
        F.add("USF-CAPABILITY-REALISATION-003", CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH,
              "root currentMainFreshness must separate historical evidence and generated reports from current claims")
    if _has_true_claim(capability_map.get("readinessClaims")):
        F.add("USF-CAPABILITY-REALISATION-004", CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH,
              "root readinessClaims must preserve non-claims")

    planted = capability_map.get("plantedDefectCoverage")
    if not isinstance(planted, list):
        F.add("USF-CAPABILITY-REALISATION-002", CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH,
              "plantedDefectCoverage must be an array")
    else:
        covered_rules = {item.get("ruleId") for item in planted if isinstance(item, dict)}
        missing_rules = sorted(CAPABILITY_REALISATION_REQUIRED_PLANTED_RULES - covered_rules)
        if missing_rules:
            F.add("USF-CAPABILITY-REALISATION-002", CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH,
                  f"plantedDefectCoverage lacks rule coverage: {', '.join(missing_rules)}")

    rows = capability_map.get("rows")
    if not isinstance(rows, list):
        F.add("USF-CAPABILITY-REALISATION-001", CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH,
              "rows array is missing")
        return

    ops_by_semantic = _client_operations_by_semantic(client_map)
    rows_by_semantic = defaultdict(list)
    for index, row in enumerate(rows):
        subject = f"{CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH}:rows[{index}]"
        if not isinstance(row, dict):
            F.add("USF-CAPABILITY-REALISATION-002", subject, "row must be an object")
            continue
        semantic_ref = row.get("semanticContractRef")
        if not _as_nonempty_string(semantic_ref):
            F.add("USF-CAPABILITY-REALISATION-001", subject, "semanticContractRef is missing")
            continue
        rows_by_semantic[semantic_ref].append((index, row))

    for semantic_ref, rows_for_ref in sorted(rows_by_semantic.items()):
        if semantic_ref not in semantic_records:
            F.add("USF-CAPABILITY-REALISATION-001",
                  f"{CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH}:rows[{rows_for_ref[0][0]}]",
                  f"unknown semanticContractRef {semantic_ref}")
        if len(rows_for_ref) > 1:
            F.add("USF-CAPABILITY-REALISATION-001", semantic_ref,
                  "semantic contract has duplicate capability-service rows")

    for semantic_ref, semantic_record in sorted(semantic_records.items()):
        row_items = rows_by_semantic.get(semantic_ref, [])
        if len(row_items) != 1:
            F.add("USF-CAPABILITY-REALISATION-001", semantic_ref,
                  "semantic contract lacks exactly one capability-service realisation row")
            continue
        index, row = row_items[0]
        subject = f"{CURRENT_MAIN_CAPABILITY_REALISATION_MAP_PATH}:rows[{index}]"

        if row.get("semanticContractPath") != semantic_paths[semantic_ref]:
            F.add("USF-CAPABILITY-REALISATION-002", subject,
                  "semanticContractPath does not resolve to the semantic contract instance")
        if row.get("capability") != semantic_record.get("capability"):
            F.add("USF-CAPABILITY-REALISATION-002", subject,
                  "capability does not match semantic contract instance")
        if row.get("capabilityDomain") != semantic_record.get("capabilityDomain"):
            F.add("USF-CAPABILITY-REALISATION-002", subject,
                  "capabilityDomain does not match semantic contract instance")
        if row.get("semanticLifecycleState") != semantic_record.get("lifecycleState"):
            F.add("USF-CAPABILITY-REALISATION-002", subject,
                  "semanticLifecycleState does not match semantic contract instance")

        disposition = row.get("realisationDisposition")
        if disposition not in CAPABILITY_REALISATION_DISPOSITIONS:
            F.add("USF-CAPABILITY-REALISATION-002", subject,
                  f"unsupported realisationDisposition: {disposition}")
        if semantic_record.get("lifecycleState") == "deprecated" and disposition != "deprecated-with-rationale":
            F.add("USF-CAPABILITY-REALISATION-002", subject,
                  "deprecated semantic contract requires deprecated-with-rationale disposition")
        if semantic_record.get("lifecycleState") == "deferred" and disposition != "deferred-with-rationale":
            F.add("USF-CAPABILITY-REALISATION-002", subject,
                  "deferred semantic contract requires deferred-with-rationale disposition")

        freshness = row.get("currentMainFreshness")
        if not isinstance(freshness, dict) or freshness.get("status") != "current-main":
            F.add("USF-CAPABILITY-REALISATION-003", subject,
                  "row currentMainFreshness must be current-main")
        elif (freshness.get("historicalEvidenceTreatment") != "lineage-only-not-current-proof"
              or freshness.get("generatedReportAuthority") != "lower-authority-summary-only"):
            F.add("USF-CAPABILITY-REALISATION-003", subject,
                  "row currentMainFreshness must keep historical evidence and generated reports below current claims")
        if row.get("generatedReportAuthority") != "lower-authority-summary-only":
            F.add("USF-CAPABILITY-REALISATION-004", subject,
                  "row generatedReportAuthority must be lower-authority-summary-only")
        if _has_generated_report_authority_overclaim(row.get("sourceAuthorityRefs")):
            F.add("USF-CAPABILITY-REALISATION-004", subject,
                  "generated reports must not appear as semantic authority refs")

        validator_coverage = set(_string_list(row.get("validatorCoverage")))
        if CAPABILITY_REALISATION_REQUIRED_VALIDATOR not in validator_coverage:
            F.add("USF-CAPABILITY-REALISATION-002", subject,
                  "validatorCoverage lacks capability-service realisation validator")

        operations = ops_by_semantic.get(semantic_ref, [])
        expected_route_ids = _route_ids(operations)
        observed_route_ids = _traceability_route_ids(row)
        route_traceability = row.get("routeTraceability")
        if operations:
            if observed_route_ids != expected_route_ids:
                F.add("USF-CAPABILITY-REALISATION-002", subject,
                      "routeTraceability does not match client-contract operations for semantic contract")
            if CAPABILITY_REALISATION_CLIENT_VALIDATOR not in validator_coverage:
                F.add("USF-CAPABILITY-REALISATION-002", subject,
                      "realised route capability lacks client-contract validator coverage")
            for field in ("implementationRefs", "interfaceContractRefs", "serviceOrProviderRefs",
                          "authAndSessionBoundaries", "tenantBoundaries", "auditEventRefs",
                          "telemetryRefs", "proofRefs"):
                if not _string_list(row.get(field)):
                    F.add("USF-CAPABILITY-REALISATION-002", subject,
                          f"{field} must be non-empty for realised or partial capabilities")
            if row.get("implementationAuthority") != "semantic-contract-bound-local-implementation-only":
                F.add("USF-CAPABILITY-REALISATION-002", subject,
                      "implementation paths must be bound to semantic authority and marked local-only")
            if row.get("localImplementationOnly") is not True:
                F.add("USF-CAPABILITY-REALISATION-002", subject,
                      "realised current-main implementation must be marked localImplementationOnly")
        else:
            if observed_route_ids or (isinstance(route_traceability, list) and route_traceability):
                F.add("USF-CAPABILITY-REALISATION-002", subject,
                      "semantic-contract-only rows must not claim route traceability")
            if _string_list(row.get("implementationRefs")):
                F.add("USF-CAPABILITY-REALISATION-002", subject,
                      "implementationRefs present without current client-contract route authority")
            if not _as_nonempty_string(row.get("exclusionRationale")):
                F.add("USF-CAPABILITY-REALISATION-002", subject,
                      "semantic-contract-only, deferred, deprecated, not-claimed, or out-of-scope rows require rationale")

        generated = row.get("generatedClientInput")
        if not isinstance(generated, dict):
            F.add("USF-CAPABILITY-REALISATION-004", subject,
                  "generatedClientInput is missing")
            generated = {}
        if generated.get("status") in {"stale", "unknown"} or generated.get("stale") is True:
            F.add("USF-CAPABILITY-REALISATION-003", subject,
                  "generated-client input freshness is stale or unknown")
        if generated.get("generatedClientReady") is True or generated.get("sdkReady") is True:
            F.add("USF-CAPABILITY-REALISATION-004", subject,
                  "generated client and SDK readiness must remain false")

        readiness = row.get("readinessClaims")
        if not isinstance(readiness, dict):
            F.add("USF-CAPABILITY-REALISATION-004", subject,
                  "readinessClaims is missing")
            readiness = {}
        for field in CAPABILITY_REALISATION_READINESS_CLAIMS:
            if readiness.get(field) is True:
                F.add("USF-CAPABILITY-REALISATION-004", subject, f"{field} must not be true")

        proof_status = row.get("proofStatus")
        if proof_status not in CAPABILITY_REALISATION_PROOF_STATUSES:
            F.add("USF-CAPABILITY-REALISATION-004", subject,
                  f"unsupported or overclaiming proofStatus: {proof_status}")
        non_claims = set(_string_list(row.get("nonClaims")))
        missing_non_claims = sorted(CAPABILITY_REALISATION_REQUIRED_NONCLAIMS - non_claims)
        if missing_non_claims:
            F.add("USF-CAPABILITY-REALISATION-004", subject,
                  f"missing non-claims: {', '.join(missing_non_claims)}")


def _load_instance_ids(F):
    instance_ids = set()
    for p in sorted(glob.glob("spec/instances/**/*.json", recursive=True)):
        record = load_json(p, F)
        if isinstance(record, dict) and isinstance(record.get("id"), str):
            instance_ids.add(record["id"])
    return instance_ids


def _target_concept_tokens(target):
    if not isinstance(target, str):
        return []
    return [token.strip() for token in target.split(";") if token.strip()]


def validate_source_import_submanifest_targets(F, sub_path, entries, instance_ids):
    if not isinstance(entries, list):
        return
    for i, entry in enumerate(entries):
        subject = f"{sub_path}:entries[{i}]"
        target = entry.get("targetUsfConcept") if isinstance(entry, dict) else None
        for token in _target_concept_tokens(target):
            if token not in instance_ids:
                F.add("USF-IMPORT-014", subject, f"unresolved targetUsfConcept token: {token}")


def validate_instance_data(ctx, F, data_by_path, source_paths=None, existing_paths=None,
                           evidence_ids=None, api_route_records=None, route_interface_coverage=None,
                           client_contract_map=None, capability_realisation_map=None,
                           generated_sdk_client_readiness_map=None, current_blob_shas=None,
                           package_manifest=None, public_api_readiness_map=None,
                           openapi_document=None):
    instance_id_to_paths = defaultdict(list)
    for p, data in data_by_path.items():
        if isinstance(data, dict) and isinstance(data.get("id"), str):
            instance_id_to_paths[data["id"]].append(p)

    for instance_id, paths in sorted(instance_id_to_paths.items()):
        if len(paths) > 1:
            F.add("USF-INSTANCE-005", instance_id, f"duplicate instance id in {paths}")

    instance_ids = set(instance_id_to_paths)
    source_paths = source_paths or set()
    existing_paths = existing_paths or set()
    evidence_ids = evidence_ids or set()
    schema_urns = {schema.get("$id") for schema in ctx["sd"].values() if isinstance(schema, dict)}
    schema_paths = {f"spec/schemas/{name}.schema.json" for name in ctx["sd"]}

    def resolves(ref):
        base = ref.split("#", 1)[0]
        if (ref in instance_ids or base in instance_ids
                or ref in evidence_ids or base in evidence_ids
                or ref in source_paths or base in source_paths
                or ref in schema_urns or base in schema_urns
                or ref in schema_paths or base in schema_paths
                or ref in existing_paths or base in existing_paths):
            return True
        if ref.startswith("urn:usf:schema:"):
            return ref.split("#", 1)[0] in schema_urns
        if ref.startswith("source:"):
            return ref.removeprefix("source:") in source_paths
        return False

    for p, data in data_by_path.items():
        schema = _schema_for_instance_path(p)
        if schema not in ctx["sd"]:
            F.add("USF-INSTANCE-003", p, f"no schema '{schema}'")
            continue
        errs = list(Draft202012Validator(ctx["sd"][schema]).iter_errors(data))
        for err in errs:
            F.add("USF-INSTANCE-002", p, err.message[:160])
        if errs:
            continue
        for field, ref in _collect_instance_refs(data):
            discriminator = _cross_repo_discriminator(ref)
            if discriminator is not None:
                F.add("USF-NATIVE-001", f"{p}:{field}",
                      f"cross-repo legacy discriminator ({discriminator}) in governed reference: {ref}; "
                      f"use a canonical repo-local USF path")
                continue
            if not resolves(ref):
                F.add("USF-INSTANCE-004", f"{p}:{field}", f"unresolved reference: {ref}")
        if schema == "semantic-contract":
            _validate_semantic_complete_facets(F, p, data, resolves)

    matrix_path = "docs/architecture/capability-source-coverage-matrix.md"
    if matrix_path in existing_paths:
        matrix_text = load_text(matrix_path, F)
        if matrix_text is not None:
            validate_semantic_coverage_matrix(F, matrix_text, instance_ids, matrix_path)
    validate_api_route_interface_coverage(
        F,
        data_by_path,
        api_route_records=api_route_records,
        route_interface_coverage=route_interface_coverage,
    )
    validate_non_ui_client_contract_map(
        F,
        data_by_path,
        api_route_records=api_route_records,
        route_interface_coverage=route_interface_coverage,
        client_contract_map=client_contract_map,
    )
    validate_current_main_capability_realisation_map(
        F,
        data_by_path,
        client_contract_map=client_contract_map,
        capability_realisation_map=capability_realisation_map,
    )
    validate_generated_sdk_client_readiness_map(
        F,
        client_contract_map=client_contract_map,
        generated_readiness_map=generated_sdk_client_readiness_map,
        current_blob_shas=current_blob_shas,
        package_manifest=package_manifest,
    )
    validate_public_api_readiness_map(
        F,
        client_contract_map=client_contract_map,
        public_api_readiness_map=public_api_readiness_map,
        current_blob_shas=current_blob_shas,
        openapi_document=openapi_document,
    )


def check_instances(ctx, F):
    """Validate committed semantic corpus instances under spec/instances.

    Directory name selects the schema: spec/instances/<schema-id>/*.json. References
    resolve to another instance id, an existing repository path, a schema URN, or a
    sourceRef.path recorded in the import manifest. This keeps real instances on the
    same repeatable validator path as schemas, fixtures, and imports.
    """
    root = "spec/instances"
    paths = sorted(glob.glob(f"{root}/**/*.json", recursive=True))
    if not paths:
        return "not-run"

    data_by_path = {}
    for p in paths:
        data = load_json(p, F)
        if data is not None:
            data_by_path[p] = data

    source_paths = set()
    manifest = load_json("spec/registries/source-import-manifest.json", F)
    if isinstance(manifest, dict):
        for entry in manifest.get("entries", []):
            source_ref = entry.get("sourceRef") if isinstance(entry, dict) else None
            source_path = source_ref.get("path") if isinstance(source_ref, dict) else None
            if isinstance(source_path, str):
                source_paths.add(source_path)

    existing_paths = {p[2:] if p.startswith("./") else p
                      for p in glob.glob("**/*", recursive=True)
                      if os.path.isfile(p)}
    evidence_ids = set()
    for p in sorted(glob.glob("evidence/evidence-envelope/*.json")) + sorted(glob.glob("evidence/proof-evidence/*.json")):
        record = load_json(p, F)
        if isinstance(record, dict) and isinstance(record.get("id"), str):
            evidence_ids.add(record["id"])
    validate_instance_data(ctx, F, data_by_path, source_paths=source_paths,
                           existing_paths=existing_paths, evidence_ids=evidence_ids)
    return "ran"


def check_imports(ctx, F):
    """Validate committed source-import instances in the repeatable validator path.

    This deliberately performs repository-owned checks only: schema validity, fixed
    manifest size, internal uniqueness/no-loss shape, canonical value preservation,
    path-safety, and known source-kind classification rules. External reconciliation
    against USF's own source lineage remains documented evidence until a source-evidence
    harness is authorised.
    """
    baseline_path = "spec/registries/source-import-manifest.json"
    if not os.path.exists(baseline_path):
        return "not-run"
    data = load_json(baseline_path, F)
    if data is None:
        return "ran"
    errors = list(Draft202012Validator(ctx["sd"]["import-manifest"]).iter_errors(data))
    for err in errors:
        F.add("USF-IMPORT-001", baseline_path, err.message[:160])
    if errors or not isinstance(data, dict):
        return "ran"

    entries = data.get("entries")
    if not isinstance(entries, list):
        F.add("USF-IMPORT-001", baseline_path, "entries must be an array")
        return "ran"
    expected_count = SOURCE_AUDIT_BASE["entryCount"]
    if len(entries) != expected_count:
        F.add("USF-IMPORT-002", baseline_path, f"{len(entries)} entries != expected {expected_count}")
    validate_import_manifest_audit_base(F, baseline_path, data)

    seen_paths = set()
    duplicate_paths = set()
    baseline_by_path = {}
    source_kinds = ctx["canon"].get("source-kinds", set())
    source_roles = ctx["canon"].get("source-roles", set())
    dispositions = ctx["canon"].get("disposition-values", set())
    for i, entry in enumerate(entries):
        subject = f"{baseline_path}:entries[{i}]"
        source_ref = entry.get("sourceRef") if isinstance(entry, dict) else None
        source_path = source_ref.get("path") if isinstance(source_ref, dict) else None
        if not source_path:
            F.add("USF-IMPORT-003", subject, "sourceRef.path is required for baseline no-loss validation")
        elif source_path in seen_paths:
            duplicate_paths.add(source_path)
        else:
            seen_paths.add(source_path)
            baseline_by_path[source_path] = entry

        for field, allowed in (("sourceKind", source_kinds), ("sourceRole", source_roles), ("disposition", dispositions)):
            value = entry.get(field) if isinstance(entry, dict) else None
            if value not in allowed:
                F.add("USF-IMPORT-004", subject, f"{field}={value!r}")

        target = entry.get("targetUsfConcept") if isinstance(entry, dict) else None
        if isinstance(target, str) and (
            target == source_path
            or target.startswith("../")
            or re.match(r"^(apps|packages|docs|spec|tools|evidence|config|infra|scripts|services|src)/", target)
        ):
            F.add("USF-IMPORT-005", subject, target)

        if source_path and (source_path == "package.json" or source_path.endswith("/package.json")):
            if entry.get("sourceKind") != "package" or entry.get("sourceRole") != "behavioural-evidence":
                F.add("USF-IMPORT-006", source_path, f"{entry.get('sourceKind')}/{entry.get('sourceRole')}")

        if source_path and source_path.endswith("-runtime-proof.ts"):
            if entry.get("sourceKind") != "proof-script" or entry.get("sourceRole") != "proof-evidence":
                F.add("USF-IMPORT-007", source_path, f"{entry.get('sourceKind')}/{entry.get('sourceRole')}")

    if duplicate_paths:
        F.add("USF-IMPORT-003", baseline_path, f"duplicate sourceRef.path values: {sorted(duplicate_paths)[:10]}")

    broad_targets = {
        "Configuration",
        "Package / Module",
        "Proof",
        "Source Reference",
    }
    instance_ids = _load_instance_ids(F)
    for sub_path in sorted(glob.glob("spec/registries/*source-import-manifest.json")):
        if sub_path == baseline_path:
            continue
        sub_data = load_json(sub_path, F)
        if sub_data is None:
            continue
        sub_errors = list(Draft202012Validator(ctx["sd"]["import-manifest"]).iter_errors(sub_data))
        for err in sub_errors:
            F.add("USF-IMPORT-008", sub_path, err.message[:160])
        if sub_errors or not isinstance(sub_data, dict):
            continue
        sub_entries = sub_data.get("entries")
        if not isinstance(sub_entries, list):
            F.add("USF-IMPORT-008", sub_path, "entries must be an array")
            continue
        if sub_path.endswith("authentication-slice-source-import-manifest.json") and len(sub_entries) != 159:
            F.add("USF-IMPORT-012", sub_path, f"{len(sub_entries)} entries != expected 159")
        sub_seen_paths = set()
        sub_duplicate_paths = set()
        for i, entry in enumerate(sub_entries):
            subject = f"{sub_path}:entries[{i}]"
            source_ref = entry.get("sourceRef") if isinstance(entry, dict) else None
            source_path = source_ref.get("path") if isinstance(source_ref, dict) else None
            if not source_path:
                F.add("USF-IMPORT-010", subject, "sourceRef.path is required for sub-manifest reconciliation")
                continue
            if source_path in sub_seen_paths:
                sub_duplicate_paths.add(source_path)
            sub_seen_paths.add(source_path)
            baseline_entry = baseline_by_path.get(source_path)
            if baseline_entry is None:
                F.add("USF-IMPORT-009", source_path, "not present in baseline source-import manifest")
                continue
            for field in ("sourceKind", "sourceRole", "disposition"):
                if entry.get(field) != baseline_entry.get(field):
                    F.add("USF-IMPORT-009", subject, f"{field}={entry.get(field)!r} does not match baseline {baseline_entry.get(field)!r}")
            target = entry.get("targetUsfConcept") if isinstance(entry, dict) else None
            if (
                not isinstance(target, str)
                or target in broad_targets
                or target.startswith("planned ")
                or target == source_path
                or target.startswith("../")
                or re.match(r"^(apps|packages|docs|spec|tools|evidence|config|infra|scripts|services|src)/", target)
            ):
                F.add("USF-IMPORT-011", subject, repr(target))
        validate_source_import_submanifest_targets(F, sub_path, sub_entries, instance_ids)
        if sub_duplicate_paths:
            F.add("USF-IMPORT-010", sub_path, f"duplicate sourceRef.path values: {sorted(sub_duplicate_paths)[:10]}")
    return "ran"


def validate_import_manifest_audit_base(F, path, data, expected=None):
    expected = expected or SOURCE_AUDIT_BASE
    if not isinstance(data, dict):
        F.add("USF-IMPORT-013", path, "manifest must be an object")
        return
    if "repository" in expected and data.get("sourceRepository") != expected["repository"]:
        F.add("USF-IMPORT-013", path, f"sourceRepository={data.get('sourceRepository')!r}")
    entries = data.get("entries")
    if not isinstance(entries, list):
        F.add("USF-IMPORT-013", path, "entries must be an array")
        return
    if len(entries) != expected["entryCount"]:
        F.add("USF-IMPORT-013", path, f"{len(entries)} entries != audit base {expected['entryCount']}")
    seen_paths = set()
    duplicate_paths = set()
    for i, entry in enumerate(entries):
        source_ref = entry.get("sourceRef") if isinstance(entry, dict) else None
        subject = f"{path}:entries[{i}].sourceRef"
        if not isinstance(source_ref, dict):
            F.add("USF-IMPORT-013", subject, "sourceRef must be an object")
            continue
        source_path = source_ref.get("path")
        if not isinstance(source_path, str) or not source_path:
            F.add("USF-IMPORT-013", subject, "sourceRef.path must be a non-empty string")
        elif source_path in seen_paths:
            duplicate_paths.add(source_path)
        else:
            seen_paths.add(source_path)
        # Per-entry sourceRef attribution is validated only for the fields the audit base
        # names in entrySourceRefFields. USF is self-defined: the self-defined audit base
        # pins the freeze commit only; external repository/tag attribution is discarded.
        # Selftest fixtures that omit entrySourceRefFields default to the strict
        # repository/commit/tag check via their own expected base, so a missing or mismatched
        # attribution field still fires USF-IMPORT-013 in those negative controls.
        for field in expected.get("entrySourceRefFields", ("repository", "commit", "tag")):
            if field in expected and source_ref.get(field) != expected[field]:
                F.add("USF-IMPORT-013", subject, f"{field}={source_ref.get(field)!r} != {expected[field]!r}")
    if duplicate_paths:
        F.add("USF-IMPORT-013", path, f"duplicate audit-base paths: {sorted(duplicate_paths)[:10]}")


PROOF_LEVEL_ORDER = {
    "discovery-proven": 0,
    "executable-proven": 1,
    "contract-proven": 2,
    "behaviour-proven": 3,
    "substrate-proven": 4,
    "resilience-proven": 5,
    "foundation-proven": 6,
}

ANCHOR_PAYLOAD_REQUIRED = {
    "payloadKind",
    "payloadVersion",
    "targetCommit",
    "proofId",
    "providerMode",
    "environment",
    "proofLevelClaimed",
    "proofLevelObserved",
    "liveExternalProviderClaim",
    "productionLiveClaim",
    "freshness",
    "emittedEvidence",
    "collectedEvidence",
    "sourceRefs",
    "payloadDigest",
}


def _anchor_payload_digest(data):
    payload = copy.deepcopy(data)
    payload.pop("payloadDigest", None)
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


PROOF_ANCHOR_TRUST_ROOT = f"{CORPUS}/proof-anchor-trust-root.json"


def _proof_anchor_trusted_signers():
    """Approved proof-anchor signer fingerprints (ADR 0006, ADR 0007, ADR 0008).

    Fail-closed: a missing or malformed trust root, or an empty list, means no signer
    is trusted, so any anchor that claims a signer is rejected (USF-ANCHOR-008). CI
    performs cryptographic attestation verification before publishing the annotated tag.
    """
    data = load_json(PROOF_ANCHOR_TRUST_ROOT, Findings())
    if isinstance(data, dict) and isinstance(data.get("trustedSigners"), list):
        return {s for s in data["trustedSigners"] if isinstance(s, str) and s}
    return set()


def validate_anchor_payload_data(F, data_by_name, current_commit=None, trusted_signers=None):
    """Validate deterministic payloads for proof freshness anchors.

    Carrier and signer trust are decided by ADR 0006 (carrier lineage), ADR 0007
    (repository CI attestation identity), and ADR 0008 (annotated tag carrying a
    CI-attested payload). This checks the trust-root membership of a claimed signer
    fingerprint; CI verifies the cryptographic attestation before publishing the tag.
    """
    if trusted_signers is None:
        trusted_signers = _proof_anchor_trusted_signers()
    for name, data in data_by_name.items():
        if not isinstance(data, dict):
            F.add("USF-ANCHOR-001", name, "anchor payload must be a JSON object")
            continue
        if data.get("authorityLevel") == "generated-report":
            F.add("USF-ANCHOR-007", name, "generated reports cannot serve as proof freshness anchor payloads")

        missing = sorted(k for k in ANCHOR_PAYLOAD_REQUIRED if k not in data)
        if missing:
            F.add("USF-ANCHOR-001", name, f"missing fields: {missing}")
            continue
        if data.get("payloadKind") != "proof-freshness-anchor-payload":
            F.add("USF-ANCHOR-001", name, f"unexpected payloadKind: {data.get('payloadKind')}")

        target = data.get("targetCommit")
        freshness = data.get("freshness")
        if not isinstance(target, str) or not target:
            F.add("USF-ANCHOR-001", name, "targetCommit must be a non-empty string")
        if current_commit and target != current_commit:
            F.add("USF-ANCHOR-002", name, f"{target} != {current_commit}")
        if not isinstance(freshness, dict):
            F.add("USF-ANCHOR-001", name, "freshness must be an object")
        else:
            if freshness.get("commit") != target or freshness.get("stale") is not False:
                F.add("USF-ANCHOR-002", name, "freshness must be non-stale and match targetCommit")

        digest = data.get("payloadDigest")
        if not isinstance(digest, str) or not digest.startswith("sha256:"):
            F.add("USF-ANCHOR-001", name, "payloadDigest must be a sha256 digest")
        elif digest != _anchor_payload_digest(data):
            F.add("USF-ANCHOR-003", name, "payloadDigest does not match canonical payload content")

        for field in ("emittedEvidence", "collectedEvidence", "sourceRefs"):
            value = data.get(field)
            if not isinstance(value, list) or not value or not all(isinstance(item, str) and item for item in value):
                F.add("USF-ANCHOR-001", f"{name}:{field}", "field must be a non-empty string array")

        claimed = data.get("proofLevelClaimed")
        observed = data.get("proofLevelObserved")
        if claimed in PROOF_LEVEL_ORDER and observed in PROOF_LEVEL_ORDER:
            if PROOF_LEVEL_ORDER[claimed] > PROOF_LEVEL_ORDER[observed]:
                F.add("USF-ANCHOR-004", name, f"{claimed} > {observed}")
        else:
            F.add("USF-ANCHOR-001", name, "proof levels must be canonical values")

        if data.get("liveExternalProviderClaim") is True:
            observed_level = PROOF_LEVEL_ORDER.get(observed, -1)
            if data.get("providerMode") != "live-external-provider" or observed_level < PROOF_LEVEL_ORDER["substrate-proven"]:
                F.add("USF-ANCHOR-005", name, f"{data.get('providerMode')}/{observed}")

        if data.get("productionLiveClaim") is True and data.get("environment") != "production-live":
            F.add("USF-ANCHOR-006", name, f"environment={data.get('environment')}")

        # A proof anchor is only trustworthy if it carries a trusted signer fingerprint.
        # An unsigned payload must fail closed: otherwise the trust root is bypassable by omission.
        signer = data.get("signerFingerprint")
        if not isinstance(signer, str) or not signer:
            F.add("USF-ANCHOR-008", name, "proof anchor payload is unsigned: a trusted signerFingerprint is required")
        elif signer not in trusted_signers:
            F.add("USF-ANCHOR-008", name, f"signer is not in the approved proof-anchor trust root: {signer}")


def _evidence_kind_for_path(path):
    rel = path.replace(os.sep, "/")
    if "/proof-evidence/" in f"/{rel}":
        return "proof"
    if "/evidence-envelope/" in f"/{rel}":
        return "envelope"
    return None


def _strip_fragment(ref):
    return ref.split("#", 1)[0]


def _split_ref_fragment(ref):
    base, sep, fragment = ref.partition("#")
    return base, fragment if sep else None


def _source_reference_allowlist(F):
    data = load_json(SOURCE_REFERENCE_ALLOWLIST, F)
    allowed = {}
    if data is None:
        return allowed
    entries = data.get("allowlist") if isinstance(data, dict) else None
    if not isinstance(entries, list):
        F.add("USF-PARSE-001", SOURCE_REFERENCE_ALLOWLIST, "allowlist must be an array")
        return allowed
    for i, entry in enumerate(entries):
        if not isinstance(entry, dict):
            F.add("USF-PARSE-001", f"{SOURCE_REFERENCE_ALLOWLIST}:{i}", "allowlist entry must be an object")
            continue
        path = entry.get("path")
        rationale = entry.get("rationale")
        fragments = entry.get("fragments", [])
        if not isinstance(path, str) or not path:
            F.add("USF-PARSE-001", f"{SOURCE_REFERENCE_ALLOWLIST}:{i}", "allowlist path is required")
            continue
        if not isinstance(rationale, str) or not rationale.strip():
            F.add("USF-PARSE-001", f"{SOURCE_REFERENCE_ALLOWLIST}:{path}", "allowlist rationale is required")
            continue
        if not isinstance(fragments, list) or not all(isinstance(v, str) and v for v in fragments):
            F.add("USF-PARSE-001", f"{SOURCE_REFERENCE_ALLOWLIST}:{path}", "fragments must be non-empty strings")
            continue
        allowed[path] = set(fragments)
    return allowed


def _json_fragment_resolves(base, fragment, existing_paths):
    if fragment is None:
        return True
    if base not in existing_paths:
        return False
    if not base.endswith(".json"):
        return True
    if not fragment.startswith("/"):
        return False
    data = load_json(base, Findings())
    return data is not None and resolve_pointer(data, fragment) is not None


def _source_ref_resolves(ref, existing_paths, source_paths=None, source_allowlist=None):
    base, fragment = _split_ref_fragment(ref)
    source_paths = source_paths or set()
    source_allowlist = source_allowlist or {}
    if not base:
        return False
    if base in existing_paths:
        return _json_fragment_resolves(base, fragment, existing_paths)
    if base in source_paths:
        return True
    if base in source_allowlist:
        allowed_fragments = source_allowlist[base]
        return fragment is None or fragment in allowed_fragments
    return False


def _collect_evidence_source_refs(data):
    if not isinstance(data, dict):
        return
    for ref in data.get("sourceRefs", []):
        if isinstance(ref, str):
            yield "sourceRefs", ref
    for ref in data.get("emittedEvidence", []):
        if isinstance(ref, str):
            yield "emittedEvidence", ref


def validate_evidence_data(ctx, F, data_by_path, existing_paths=None, source_paths=None,
                           source_allowlist=None, current_commit=None):
    """Validate committed evidence/proof records and their cross-record references.

    Directory selects the schema: evidence/evidence-envelope/*.json or
    evidence/proof-evidence/*.json. Source refs resolve through repository paths,
    source-import manifest paths, or the explicit source-reference allowlist.
    """
    existing_paths = existing_paths or set()
    source_paths = source_paths or set()
    source_allowlist = source_allowlist or {}
    id_to_paths = defaultdict(list)
    envelope_ids = set()
    envelope_by_id = {}
    proof_ids = set()

    for p, data in data_by_path.items():
        if isinstance(data, dict) and isinstance(data.get("id"), str):
            id_to_paths[data["id"]].append(p)
            kind = _evidence_kind_for_path(p)
            if kind == "envelope":
                envelope_ids.add(data["id"])
                envelope_by_id[data["id"]] = data
            elif kind == "proof":
                proof_ids.add(data["id"])

    for eid, paths in sorted(id_to_paths.items()):
        if len(paths) > 1:
            F.add("USF-EVIDENCE-003", eid, f"duplicate evidence/proof id in {paths}")

    for p, data in data_by_path.items():
        kind = _evidence_kind_for_path(p)
        if kind == "envelope":
            errors = list(Draft202012Validator(ctx["sd"]["evidence-envelope"]).iter_errors(data))
            for err in errors:
                F.add("USF-EVIDENCE-001", p, err.message[:160])
        elif kind == "proof":
            errors = list(Draft202012Validator(ctx["sd"]["proof-evidence"]).iter_errors(data))
            for err in errors:
                F.add("USF-EVIDENCE-002", p, err.message[:160])
        else:
            continue

        if not isinstance(data, dict):
            continue

        freshness = data.get("freshness")
        if isinstance(freshness, dict) and freshness.get("stale") is False and current_commit:
            commit = freshness.get("commit")
            if isinstance(commit, str) and commit != current_commit:
                F.add("USF-EVIDENCE-009", p, f"{commit} != {current_commit}")
            if kind == "proof":
                F.add("USF-POSTURE-002", p, "non-stale proof evidence requires an accepted post-merge freshness anchor")

        for field, ref in _collect_evidence_source_refs(data):
            if not _source_ref_resolves(ref, existing_paths, source_paths, source_allowlist):
                F.add("USF-EVIDENCE-005", f"{p}:{field}", f"unresolved source reference: {ref}")

        if kind != "proof":
            continue

        for ref in data.get("collectedEvidence", []):
            if isinstance(ref, str) and ref not in envelope_ids:
                F.add("USF-EVIDENCE-004", f"{p}:collectedEvidence", f"unresolved evidence reference: {ref}")
            elif isinstance(ref, str):
                envelope = envelope_by_id.get(ref)
                if isinstance(envelope, dict) and envelope.get("evidenceKind") == "runtime-proof-evidence":
                    for field in ("providerMode", "environment", "freshness"):
                        if envelope.get(field) != data.get(field):
                            F.add("USF-POSTURE-001", f"{p}:collectedEvidence:{ref}", f"{field} does not match proof evidence")

        claimed = data.get("proofLevelClaimed")
        observed = data.get("proofLevelObserved")
        if claimed in PROOF_LEVEL_ORDER and observed in PROOF_LEVEL_ORDER:
            if PROOF_LEVEL_ORDER[claimed] > PROOF_LEVEL_ORDER[observed]:
                F.add("USF-EVIDENCE-006", p, f"{claimed} > {observed}")

        if data.get("liveExternalProviderClaim") is True:
            provider = data.get("providerMode")
            observed_level = PROOF_LEVEL_ORDER.get(observed, -1)
            if provider != "live-external-provider" or observed_level < PROOF_LEVEL_ORDER["substrate-proven"]:
                F.add("USF-EVIDENCE-007", p, f"{provider}/{observed}")


def validate_evidence_paths(F, paths, records=None):
    known_dirs = ("evidence/evidence-envelope/", "evidence/proof-evidence/")
    records = records or {}
    for p in sorted(paths):
        if not p.startswith("evidence/") or not p.endswith(".json"):
            continue
        if p.startswith(known_dirs):
            continue
        data = records.get(p)
        if isinstance(data, dict) and data.get("authorityLevel") == "generated-report":
            continue
        F.add("USF-EVIDENCE-008", p, "evidence JSON must be under evidence/evidence-envelope or evidence/proof-evidence unless it is a generated report")


def check_evidence(ctx, F):
    """Validate committed evidence/proof records under evidence/."""
    paths = sorted(glob.glob("evidence/evidence-envelope/*.json")) + sorted(glob.glob("evidence/proof-evidence/*.json"))
    all_evidence_json = sorted(glob.glob("evidence/**/*.json", recursive=True))
    records = {p: load_json(p, F) for p in all_evidence_json if p not in set(paths)}
    validate_evidence_paths(F, all_evidence_json, records)
    if not paths:
        return "not-run"
    data_by_path = {}
    for p in paths:
        data = load_json(p, F)
        if data is not None:
            data_by_path[p] = data
    existing_paths = {p[2:] if p.startswith("./") else p
                      for p in glob.glob("**/*", recursive=True)
                      if os.path.isfile(p)}
    source_paths = _source_import_paths(F)
    source_allowlist = _source_reference_allowlist(F)
    try:
        current_commit = git_checked("rev-parse", "HEAD")
    except Exception:
        current_commit = None
    validate_evidence_data(ctx, F, data_by_path, existing_paths=existing_paths,
                           source_paths=source_paths, source_allowlist=source_allowlist,
                           current_commit=current_commit)
    return "ran"


ADR_REF_FIELDS = {"semanticRefs", "sourceRefs", "proofRefs", "validatorRefs"}
REAL_REQUIRED_CATEGORIES = ("adr", "source-import", "semantic", "evidence-envelope", "proof-evidence")


def _load_json_files(paths, F):
    data_by_path = {}
    for p in paths:
        data = load_json(p, F)
        if data is not None:
            data_by_path[p] = data
    return data_by_path


def _source_import_paths(F):
    source_paths = set()
    manifest = load_json("spec/registries/source-import-manifest.json", F)
    if isinstance(manifest, dict):
        for entry in manifest.get("entries", []):
            source_ref = entry.get("sourceRef") if isinstance(entry, dict) else None
            source_path = source_ref.get("path") if isinstance(source_ref, dict) else None
            if isinstance(source_path, str):
                source_paths.add(source_path)
    return source_paths


def _existing_repo_paths():
    try:
        tracked = git_checked("ls-files", "--cached", "--others", "--exclude-standard")
        return {p for p in tracked.splitlines() if p}
    except Exception:
        return {p[2:] if p.startswith("./") else p
                for p in glob.glob("**/*", recursive=True)
                if os.path.isfile(p)}


def _ref_resolves(ref, existing_paths, source_paths, ids=None, source_allowlist=None):
    base = _strip_fragment(ref)
    ids = ids or set()
    if ref in ids or base in ids:
        return True
    if _source_ref_resolves(ref, existing_paths, source_paths, source_allowlist):
        return True
    if ref.startswith("git:") and len(ref) > 4:
        return True
    if ref.startswith("urn:usf:schema:") and ref.split("#", 1)[0] in {
        schema.get("$id") for schema in CTX_FOR_REF_RESOLUTION["sd"].values() if isinstance(schema, dict)
    }:
        return True
    return False


def _is_semantic_ref_type(ref):
    base = _strip_fragment(ref)
    return base.startswith("urn:usf:schema:") or base.startswith("docs/architecture/") or base.startswith("spec/") or base.startswith("docs/adr/")


CTX_FOR_REF_RESOLUTION = {"sd": {}}


def validate_real_adr_data(ctx, F, data_by_path, existing_paths=None, source_paths=None, proof_ids=None, source_allowlist=None):
    existing_paths = existing_paths or set()
    source_paths = source_paths or set()
    proof_ids = proof_ids or set()
    source_allowlist = source_allowlist or {}
    CTX_FOR_REF_RESOLUTION["sd"] = ctx["sd"]
    for p, data in data_by_path.items():
        errors = list(Draft202012Validator(ctx["sd"]["adr"]).iter_errors(data))
        for err in errors:
            F.add("USF-REAL-002", p, err.message[:160])
        if not isinstance(data, dict):
            continue
        adr_id = data.get("id")
        if isinstance(adr_id, str) and re.match(r"^\d{4}-", adr_id):
            if not glob.glob(f"docs/adr/{adr_id}.md"):
                F.add("USF-REAL-003", p, f"missing docs/adr/{adr_id}.md")
        for field in ADR_REF_FIELDS:
            values = data.get(field, [])
            if not isinstance(values, list):
                continue
            for ref in values:
                if not isinstance(ref, str):
                    continue
                if field == "semanticRefs" and not _is_semantic_ref_type(ref):
                    F.add("USF-REAL-006", f"{p}:{field}", f"non-semantic reference: {ref}")
                    continue
                ids = proof_ids if field == "proofRefs" else set()
                if not _ref_resolves(ref, existing_paths, source_paths, ids=ids, source_allowlist=source_allowlist):
                    F.add("USF-REAL-004", f"{p}:{field}", f"unresolved reference: {ref}")


def validate_real_instance_inventory(F, category_paths):
    states = {}
    for name in REAL_REQUIRED_CATEGORIES:
        paths = category_paths.get(name, [])
        if not paths:
            F.add("USF-REAL-001", name, "required real-instance corpus category is empty")
            states[name] = "not-run"
        else:
            states[name] = "ran"
    return states


def _repo_dir_set():
    try:
        tracked = git_checked("ls-files", "--cached", "--others", "--exclude-standard")
        dirs = set()
        for path in tracked.splitlines():
            while "/" in path:
                path = path.rsplit("/", 1)[0]
                dirs.add(path)
        return dirs
    except Exception:
        return {
            p[2:] if p.startswith("./") else p
            for p in glob.glob("**", recursive=True)
            if os.path.isdir(p)
        }


def validate_current_state_authority_index(F, record=None, existing_paths=None, existing_dirs=None, spec_instance_dirs=None):
    existing_paths = _existing_repo_paths() if existing_paths is None else set(existing_paths)
    existing_dirs = _repo_dir_set() if existing_dirs is None else set(existing_dirs)
    spec_instance_dirs = (
        sorted(os.path.basename(path) for path in glob.glob("spec/instances/*") if os.path.isdir(path))
        if spec_instance_dirs is None
        else sorted(spec_instance_dirs)
    )
    if record is None:
        record = load_json(AUTHORITY_INDEX_PATH, F)
    if not isinstance(record, dict):
        F.add("USF-AUTHORITY-001", AUTHORITY_INDEX_PATH, "authority index JSON is missing or not an object")
        return

    coverage = record.get("specInstanceFamilyCoverage")
    if not isinstance(coverage, list):
        F.add("USF-AUTHORITY-001", AUTHORITY_INDEX_PATH, "specInstanceFamilyCoverage is missing")
        coverage = []
    coverage_by_family = {row.get("family"): row for row in coverage if isinstance(row, dict)}
    missing = sorted(set(spec_instance_dirs) - set(coverage_by_family))
    extra = sorted(set(coverage_by_family) - set(spec_instance_dirs))
    if missing or extra:
        F.add("USF-AUTHORITY-001", "specInstanceFamilyCoverage", f"family coverage mismatch missing={missing} extra={extra}")
    for family in spec_instance_dirs:
        row = coverage_by_family.get(family, {})
        expected_path = f"spec/instances/{family}/"
        if row.get("path") != expected_path:
            F.add("USF-AUTHORITY-001", f"specInstanceFamilyCoverage.{family}.path", f"expected {expected_path}")
        if row.get("activeAuthority") is not True:
            F.add("USF-AUTHORITY-001", f"specInstanceFamilyCoverage.{family}.activeAuthority", "instance family must be active current authority")
        if "validate-spec.py instances" not in str(row.get("validator", "")):
            F.add("USF-AUTHORITY-001", f"specInstanceFamilyCoverage.{family}.validator", "instance family validator is missing")
        if "superseded" not in str(row.get("stalenessPropagation", "")).lower():
            F.add("USF-AUTHORITY-001", f"specInstanceFamilyCoverage.{family}.stalenessPropagation", "staleness propagation is missing")
        if expected_path.rstrip("/") not in existing_dirs:
            F.add("USF-AUTHORITY-001", expected_path, "covered instance family path does not exist")

    seal_records = record.get("foundationSubstrateClosureSealRecords")
    if not isinstance(seal_records, list):
        F.add("USF-AUTHORITY-001", "foundationSubstrateClosureSealRecords", "USF-292 seal record list is missing")
        seal_records = []
    seal_paths = {row.get("path") for row in seal_records if isinstance(row, dict)}
    missing_seals = sorted(REQUIRED_USF292_SEAL_RECORDS - seal_paths)
    if missing_seals:
        F.add("USF-AUTHORITY-001", "foundationSubstrateClosureSealRecords", f"missing USF-292 seal records: {missing_seals}")
    for row in seal_records:
        if not isinstance(row, dict):
            continue
        subject = row.get("path", "foundationSubstrateClosureSealRecords")
        if row.get("issueId") != "USF-292":
            F.add("USF-AUTHORITY-001", subject, "seal record must be linked to USF-292")
        if row.get("activeAuthority") is not True:
            F.add("USF-AUTHORITY-001", subject, "seal record must remain active closure authority")
        if subject not in existing_paths:
            F.add("USF-AUTHORITY-001", subject, "seal record path does not resolve")

    staleness = record.get("stalenessPropagationPolicy")
    required_staleness_fields = {
        "appliesTo",
        "changedSemanticDefinitionAction",
        "changedProofOrEvidenceAction",
        "generatedReportAction",
        "humanDecisionAction",
        "validatorFailureMode",
    }
    if not isinstance(staleness, dict):
        F.add("USF-AUTHORITY-001", "stalenessPropagationPolicy", "staleness propagation policy is missing")
    else:
        for field in sorted(required_staleness_fields):
            value = staleness.get(field)
            if not value:
                F.add("USF-AUTHORITY-001", f"stalenessPropagationPolicy.{field}", "field is missing")
        staleness_text = json.dumps(staleness).lower()
        for token in ("stale", "superseded", "fail closed"):
            if token not in staleness_text:
                F.add("USF-AUTHORITY-001", "stalenessPropagationPolicy", f"missing policy token: {token}")

    boundary = record.get("aiUiCompositionBoundary")
    if not isinstance(boundary, dict):
        F.add("USF-AUTHORITY-001", "aiUiCompositionBoundary", "AI/UI composition boundary is missing")
    else:
        for field in ("allowedConsumers", "allowedInputs", "requiredBoundary", "prohibitedInferences", "nonClaims"):
            if not boundary.get(field):
                F.add("USF-AUTHORITY-001", f"aiUiCompositionBoundary.{field}", "field is missing")
        non_claims = set(boundary.get("nonClaims", [])) if isinstance(boundary.get("nonClaims"), list) else set()
        missing_non_claims = sorted(AUTHORITY_INDEX_BOUNDARY_NON_CLAIMS - non_claims)
        if missing_non_claims:
            F.add("USF-AUTHORITY-001", "aiUiCompositionBoundary.nonClaims", f"missing non-claims: {missing_non_claims}")
        boundary_text = json.dumps(boundary).lower()
        if "proposal" not in boundary_text or "product ui readiness" not in boundary_text:
            F.add("USF-AUTHORITY-001", "aiUiCompositionBoundary", "proposal/product UI readiness boundary is incomplete")


REPORT_STATUS_TOKENS = {"pass", "green", "complete", "ready", "final", "stale", "unknown"}


def _report_filename_status_tokens(path):
    stem = os.path.basename(path).removesuffix(".json").lower()
    return set(re.split(r"[-_.]+", stem)) & REPORT_STATUS_TOKENS


def validate_validator_report_data(ctx, F, data_by_path, existing_paths=None, evidence_ids=None,
                                   current_commit=None):
    existing_paths = existing_paths or set()
    evidence_ids = evidence_ids or set()
    for p, data in data_by_path.items():
        errors = list(Draft202012Validator(ctx["sd"]["validator-report"]).iter_errors(data))
        for err in errors:
            F.add("USF-REAL-005", p, err.message[:160])
        if not isinstance(data, dict):
            continue
        if data.get("authorityLevel") == "generated-report":
            if not p.startswith("evidence/"):
                F.add("USF-REPORT-003", p, "generated reports must be committed under evidence/")
            status_tokens = _report_filename_status_tokens(p)
            if status_tokens:
                F.add("USF-REPORT-004", p, f"status/readiness tokens in filename: {sorted(status_tokens)}")
        for ref in data.get("evidenceRefs", []):
            if not isinstance(ref, str):
                continue
            if ref.startswith("commit:"):
                continue
            if ref in evidence_ids:
                continue
            if not _source_ref_resolves(ref, existing_paths):
                F.add("USF-REPORT-005", f"{p}:evidenceRefs", f"unresolved evidence reference: {ref}")
        freshness = data.get("freshness")
        if data.get("status") == "pass" and isinstance(freshness, dict) and freshness.get("stale") is False and current_commit:
            commit = freshness.get("commit")
            if isinstance(commit, str) and commit != current_commit:
                F.add("USF-REPORT-006", p, f"{commit} != {current_commit}")


def validate_validator_report_records(ctx, F, paths):
    existing_paths = _existing_repo_paths()
    evidence_ids = set()
    evidence_paths = sorted(glob.glob("evidence/evidence-envelope/*.json")) + sorted(glob.glob("evidence/proof-evidence/*.json"))
    for data in _load_json_files(evidence_paths, F).values():
        if isinstance(data, dict) and isinstance(data.get("id"), str):
            evidence_ids.add(data["id"])
    try:
        current_commit = git_checked("rev-parse", "HEAD")
    except Exception:
        current_commit = None
    validate_validator_report_data(
        ctx,
        F,
        _load_json_files(paths, F),
        existing_paths=existing_paths,
        evidence_ids=evidence_ids,
        current_commit=current_commit,
    )


def discover_validator_report_paths(F, paths=None):
    candidates = []
    search_paths = paths if paths is not None else glob.glob("**/*.json", recursive=True)
    for p in sorted(search_paths):
        if (p.startswith(f"{CORPUS}/fixtures/")
                or p.startswith(f"{CORPUS}/manifests/")
                or p.startswith(f"{CORPUS}/planted-defects/")
                or p.startswith("spec/schemas/")):
            continue
        data = load_json(p, F)
        is_report_name = os.path.basename(p).endswith("-report.json") or "validator-report" in os.path.basename(p)
        is_generated_report = isinstance(data, dict) and data.get("authorityLevel") == "generated-report"
        if is_report_name or is_generated_report:
            candidates.append(p)
    return candidates


def check_real_instances(ctx, F):
    """Aggregate real authored instance validation for USF-31.

    This composes the existing focused modes and adds ADR/report real-instance
    coverage so one repeatable command validates the current authored corpus.
    """
    states = {}
    adr_paths = sorted(glob.glob("tools/validate-spec/fixtures/positive/adr/[0-9][0-9][0-9][0-9]-*.json"))
    semantic_paths = sorted(glob.glob("spec/instances/**/*.json", recursive=True))
    envelope_paths = sorted(glob.glob("evidence/evidence-envelope/*.json"))
    proof_paths = sorted(glob.glob("evidence/proof-evidence/*.json"))
    import_present = os.path.exists("spec/registries/source-import-manifest.json")
    report_paths = discover_validator_report_paths(F)

    states = validate_real_instance_inventory(F, {
        "adr": adr_paths,
        "source-import": ["spec/registries/source-import-manifest.json"] if import_present else [],
        "semantic": semantic_paths,
        "evidence-envelope": envelope_paths,
        "proof-evidence": proof_paths,
    })

    check_imports(ctx, F)
    check_instances(ctx, F)
    check_evidence(ctx, F)

    existing_paths = _existing_repo_paths()
    validate_current_state_authority_index(F, existing_paths=existing_paths)
    source_paths = _source_import_paths(F)
    source_allowlist = _source_reference_allowlist(F)
    proof_ids = set()
    for data in _load_json_files(proof_paths, F).values():
        if isinstance(data, dict) and isinstance(data.get("id"), str):
            proof_ids.add(data["id"])
    validate_real_adr_data(
        ctx,
        F,
        _load_json_files(adr_paths, F),
        existing_paths=existing_paths,
        source_paths=source_paths,
        proof_ids=proof_ids,
        source_allowlist=source_allowlist,
    )
    validate_validator_report_records(ctx, F, report_paths)
    states["validator-report"] = "ran" if report_paths else "not-run"
    return states


PATCH_ROOTS = {"registry": "reg", "vocabulary": "voc", "taxonomy": "tax"}


def apply_patch(ctx, patch):
    if patch["target"] == "new-schema":
        ctx["sd"][patch["value"]["name"]] = copy.deepcopy(ctx["sd"][patch["value"]["from"]])
        return
    if patch.get("op") == "replace-root":   # replace a whole schema/catalogue root (e.g. with a non-object)
        if patch["target"] == "schema":
            ctx["sd"][patch["schema"]] = patch["value"]
        else:
            ctx[PATCH_ROOTS[patch["target"]]] = patch["value"]
        return
    root = ctx["sd"][patch["schema"]] if patch["target"] == "schema" else ctx[PATCH_ROOTS[patch["target"]]]
    pointer = patch.get("pointer", "")
    op = patch["op"]
    if op == "set":
        parent = resolve_pointer(root, pointer.rsplit("/", 1)[0]) if "/" in pointer.lstrip("/") else root
        last = pointer.rstrip("/").rsplit("/", 1)[-1]
        parent[last] = patch["value"]
    elif op == "remove":
        parent = resolve_pointer(root, pointer.rsplit("/", 1)[0]) if "/" in pointer.lstrip("/") else root
        last = pointer.rstrip("/").rsplit("/", 1)[-1]
        if isinstance(parent, list):
            parent.pop(int(last))
        else:
            parent.pop(last, None)
    elif op == "append":
        resolve_pointer(root, pointer).append(patch["value"])
    elif op == "removeItem":
        arr = resolve_pointer(root, pointer)
        if patch["value"] in arr:
            arr.remove(patch["value"])
    elif op == "dup":
        arr = resolve_pointer(root, pointer)
        arr.append(copy.deepcopy(arr[patch.get("index", 0)]))


def run_all_checks(ctx, F):
    if check_shape(ctx["voc"], ctx["tax"], ctx["reg"], F):
        return   # shape gate failed: downstream checks assume well-formed catalogues
    check_schemas(ctx, F)
    check_enums(ctx, F)
    check_registry(ctx, F)
    check_catalogues(ctx, F)
    check_safety(ctx, F)
    validate_readiness_reconciliation(F)
    validate_app_surface_implementation_plan_path_inventory(F)


def check_selftest(ctx, F):
    """Apply each planted defect to an isolated copy of the corpus and assert the exact rule fires."""
    defects = sorted(glob.glob(f"{CORPUS}/planted-defects/*.json"))
    if not defects:
        subject = f"{CORPUS}/planted-defects"
        message = "planted defect directory is missing" if not os.path.isdir(subject) else "planted defect directory is empty"
        F.add("USF-SELFTEST-001", subject, message)
        return "not-run"
    for df in defects:
        patch = load_json(df, F)                      # parse-safe (item 4): bad JSON -> USF-PARSE-001
        if patch is None:
            continue
        if not isinstance(patch, dict) or "target" not in patch or ("expectedRule" not in patch and patch.get("expectedClean") is not True):
            F.add("USF-SELFTEST-001", df, "selftest case missing target and expectedRule/expectedClean")
            continue
        sandbox = copy.deepcopy(ctx)
        try:
            if patch["target"] not in {"instances", "evidence", "evidence-paths", "real-adrs", "real-inventory", "validator-reports", "report-discovery", "directive-text", "readiness-docs", "pr-paths", "anchor-payloads", "import-manifest-data", "semantic-coverage-matrix", "source-import-submanifest-targets", "authority-index", "app-surface-plan-paths", "client-contract-map", "capability-realisation-map", "generated-sdk-client-readiness-map", "public-api-readiness-map"}:
                apply_patch(sandbox, patch)
        except Exception as e:
            F.add("USF-SELFTEST-001", df, f"patch failed to apply: {e}")
            continue
        f2 = Findings()
        if patch["target"] == "instances":
            instances = patch.get("instances")
            if not isinstance(instances, dict):
                F.add("USF-SELFTEST-001", df, "instances planted-defect needs an instances object")
                continue
            validate_instance_data(
                sandbox,
                f2,
                instances,
                source_paths=set(patch.get("sourcePaths", [])),
                existing_paths=set(patch.get("existingPaths", [])),
                evidence_ids=set(patch.get("evidenceIds", [])),
                api_route_records=patch.get("apiRouteRecords"),
                route_interface_coverage=patch.get("routeInterfaceCoverage"),
            )
        elif patch["target"] == "evidence":
            records = patch.get("records")
            if not isinstance(records, dict):
                F.add("USF-SELFTEST-001", df, "evidence planted-defect needs a records object")
                continue
            validate_evidence_data(
                sandbox,
                f2,
                records,
                existing_paths=set(patch.get("existingPaths", [])),
                source_paths=set(patch.get("sourcePaths", [])),
                source_allowlist={k: set(v) for k, v in patch.get("sourceAllowlist", {}).items()},
                current_commit=patch.get("currentCommit"),
            )
        elif patch["target"] == "real-adrs":
            records = patch.get("records")
            if not isinstance(records, dict):
                F.add("USF-SELFTEST-001", df, "real-adrs planted-defect needs a records object")
                continue
            validate_real_adr_data(
                sandbox,
                f2,
                records,
                existing_paths=set(patch.get("existingPaths", [])),
                source_paths=set(patch.get("sourcePaths", [])),
                proof_ids=set(patch.get("proofIds", [])),
                source_allowlist={k: set(v) for k, v in patch.get("sourceAllowlist", {}).items()},
            )
        elif patch["target"] == "evidence-paths":
            paths = patch.get("paths")
            if not isinstance(paths, list):
                F.add("USF-SELFTEST-001", df, "evidence-paths planted-defect needs a paths array")
                continue
            validate_evidence_paths(f2, paths, patch.get("records", {}))
        elif patch["target"] == "real-inventory":
            inventory = patch.get("inventory")
            if not isinstance(inventory, dict):
                F.add("USF-SELFTEST-001", df, "real-inventory planted-defect needs an inventory object")
                continue
            validate_real_instance_inventory(f2, inventory)
        elif patch["target"] == "validator-reports":
            records = patch.get("records")
            if not isinstance(records, dict):
                F.add("USF-SELFTEST-001", df, "validator-reports planted-defect needs a records object")
                continue
            validate_validator_report_data(
                sandbox,
                f2,
                records,
                existing_paths=set(patch.get("existingPaths", [])),
                evidence_ids=set(patch.get("evidenceIds", [])),
                current_commit=patch.get("currentCommit"),
            )
        elif patch["target"] == "report-discovery":
            records = patch.get("records")
            if not isinstance(records, dict):
                F.add("USF-SELFTEST-001", df, "report-discovery planted-defect needs a records object")
                continue
            paths = discover_validator_report_paths(f2, list(records))
            validate_validator_report_data(
                sandbox,
                f2,
                {p: records[p] for p in paths},
                existing_paths=set(patch.get("existingPaths", [])),
                evidence_ids=set(patch.get("evidenceIds", [])),
                current_commit=patch.get("currentCommit"),
            )
        elif patch["target"] == "directive-text":
            records = patch.get("records")
            if not isinstance(records, dict):
                F.add("USF-SELFTEST-001", df, "directive-text planted-defect needs a records object")
                continue
            validate_implementation_directives(f2, list(records), records=records)
        elif patch["target"] == "readiness-docs":
            records = patch.get("records")
            if not isinstance(records, dict):
                F.add("USF-SELFTEST-001", df, "readiness-docs planted-defect needs a records object")
                continue
            validate_readiness_reconciliation(f2, records=records)
        elif patch["target"] == "pr-paths":
            lines = patch.get("nameStatusLines")
            if not isinstance(lines, list):
                F.add("USF-SELFTEST-001", df, "pr-paths planted-defect needs nameStatusLines")
                continue
            validate_pr_paths(
                f2,
                lines,
                source_paths=set(patch.get("sourcePaths", [])),
                changed_records=patch.get("records", {}),
                existing_paths=set() if patch.get("ignoreExistingDirective") else None,
            )
        elif patch["target"] == "anchor-payloads":
            records = patch.get("records")
            if not isinstance(records, dict):
                F.add("USF-SELFTEST-001", df, "anchor-payloads planted-defect needs a records object")
                continue
            validate_anchor_payload_data(f2, records, current_commit=patch.get("currentCommit"))
        elif patch["target"] == "import-manifest-data":
            record = patch.get("record")
            if not isinstance(record, dict):
                F.add("USF-SELFTEST-001", df, "import-manifest-data planted-defect needs a record object")
                continue
            expected = patch.get("expectedAuditBase")
            validate_import_manifest_audit_base(
                f2,
                "planted-import-manifest",
                record,
                expected=expected if isinstance(expected, dict) else None,
            )
        elif patch["target"] == "semantic-coverage-matrix":
            matrix_text = patch.get("matrixText")
            semantic_contract_ids = patch.get("semanticContractIds")
            if not isinstance(matrix_text, str) or not isinstance(semantic_contract_ids, list):
                F.add("USF-SELFTEST-001", df, "semantic-coverage-matrix planted-defect needs matrixText and semanticContractIds")
                continue
            validate_semantic_coverage_matrix(
                f2,
                matrix_text,
                set(semantic_contract_ids),
                patch.get("matrixPath", "planted-capability-source-coverage-matrix.md"),
            )
        elif patch["target"] == "source-import-submanifest-targets":
            entries = patch.get("entries")
            instance_ids = patch.get("instanceIds")
            if not isinstance(entries, list) or not isinstance(instance_ids, list):
                F.add("USF-SELFTEST-001", df, "source-import-submanifest-targets planted-defect needs entries and instanceIds")
                continue
            validate_source_import_submanifest_targets(
                f2,
                patch.get("subPath", "planted-source-import-manifest.json"),
                entries,
                set(instance_ids),
            )
        elif patch["target"] == "authority-index":
            record = patch.get("record")
            if not isinstance(record, dict):
                F.add("USF-SELFTEST-001", df, "authority-index planted-defect needs a record object")
                continue
            validate_current_state_authority_index(
                f2,
                record=record,
                existing_paths=set(patch.get("existingPaths", [])),
                existing_dirs=set(patch.get("existingDirs", [])),
                spec_instance_dirs=set(patch.get("specInstanceDirs", [])),
            )
        elif patch["target"] == "app-surface-plan-paths":
            record = patch.get("record")
            if not isinstance(record, dict):
                F.add("USF-SELFTEST-001", df, "app-surface-plan-paths planted-defect needs a record object")
                continue
            validate_app_surface_implementation_plan_path_inventory(
                f2,
                record=record,
                existing_paths=set(patch.get("existingPaths", [])),
            )
        elif patch["target"] == "client-contract-map":
            record = patch.get("record")
            instances = patch.get("instances")
            if not isinstance(record, dict) or not isinstance(instances, dict):
                F.add("USF-SELFTEST-001", df, "client-contract-map planted-defect needs record and instances objects")
                continue
            validate_non_ui_client_contract_map(
                f2,
                instances,
                api_route_records=patch.get("apiRouteRecords"),
                route_interface_coverage=patch.get("routeInterfaceCoverage"),
                client_contract_map=record,
            )
        elif patch["target"] == "capability-realisation-map":
            record = patch.get("record")
            instances = patch.get("instances")
            if not isinstance(record, dict) or not isinstance(instances, dict):
                F.add("USF-SELFTEST-001", df, "capability-realisation-map planted-defect needs record and instances objects")
                continue
            validate_current_main_capability_realisation_map(
                f2,
                instances,
                client_contract_map=patch.get("clientContractMap"),
                capability_realisation_map=record,
            )
        elif patch["target"] == "generated-sdk-client-readiness-map":
            record = patch.get("record")
            client_contract_map = patch.get("clientContractMap")
            if not isinstance(record, dict) or not isinstance(client_contract_map, dict):
                F.add("USF-SELFTEST-001", df, "generated-sdk-client-readiness-map planted-defect needs record and clientContractMap objects")
                continue
            validate_generated_sdk_client_readiness_map(
                f2,
                client_contract_map=client_contract_map,
                generated_readiness_map=record,
                current_blob_shas=patch.get("currentBlobShas"),
                package_manifest=patch.get("packageManifest"),
            )
        elif patch["target"] == "public-api-readiness-map":
            record = patch.get("record")
            client_contract_map = patch.get("clientContractMap")
            openapi_document = patch.get("openapiDocument")
            if not isinstance(record, dict) or not isinstance(client_contract_map, dict) or not isinstance(openapi_document, dict):
                F.add("USF-SELFTEST-001", df, "public-api-readiness-map planted-defect needs record, clientContractMap, and openapiDocument objects")
                continue
            validate_public_api_readiness_map(
                f2,
                client_contract_map=client_contract_map,
                public_api_readiness_map=record,
                current_blob_shas=patch.get("currentBlobShas"),
                openapi_document=openapi_document,
            )
        else:
            run_all_checks(sandbox, f2)
        if patch.get("expectedClean") is True:
            if f2.items:
                F.add("USF-SELFTEST-001", df, f"expected clean; got {sorted(f2.rule_ids())[:8]}")
        elif patch["expectedRule"] not in f2.rule_ids():
            F.add("USF-SELFTEST-001", df, f"expected {patch['expectedRule']}; got {sorted(f2.rule_ids())[:8]}")
    return "ran"


def git_checked(*args):
    r = subprocess.run(["git", *args], capture_output=True, text=True, cwd=ROOT)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or f"git {' '.join(args)} failed (exit {r.returncode})")
    return r.stdout.strip()


IMPLEMENTATION_ROOTS = (
    "apps",
    "capabilities",
    "adapters",
    "packages",
    "tests",
    "services",
    "src",
    "config",
    "infra",
    "scripts",
)
IMPLEMENTATION_PATH_RE = re.compile(r"(^|/)(" + "|".join(IMPLEMENTATION_ROOTS) + r")/")
DISPOSITION_MATRIX_RE = re.compile(r"docs/architecture/.*source-use-disposition-matrix\.md$")
IMPLEMENTATION_DIRECTIVE_PATHS = {
    "docs/architecture/implementation-extraction-directive.md",
}
IMPLEMENTATION_DIRECTIVE_TEXT_PATH = "docs/architecture/implementation-extraction-directive.md"
APP_SURFACE_IMPLEMENTATION_PLAN_PATH = "docs/architecture/app-surface-implementation-realisation-plan.json"
APP_SURFACE_PR306_STALE_PATHS = {
    "docs/architecture/app-surface-accessibility-semantic-coverage.json",
    "docs/architecture/app-surface-api-contract-realisation.json",
    "docs/architecture/app-surface-implementation-gate.json",
    "docs/architecture/app-surface-semantic-definition-candidate-backlog.json",
}
REPOSITORY_PATH_STANDALONES = {
    "Makefile",
    "package.json",
    "pnpm-workspace.yaml",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "tsconfig.base.json",
}
REPOSITORY_PATH_RE = re.compile(
    r"^(?:apps|capabilities|adapters|packages|tests|docs|evidence|tools|spec|"
    r"config|infra|scripts|services|artifacts|\.github)/[^\s]+$"
)
REPOSITORY_PATH_TOKEN_RE = re.compile(
    r"(?<![A-Za-z0-9._/-])((?:apps|capabilities|adapters|packages|tests|docs|evidence|tools|spec|"
    r"config|infra|scripts|services|artifacts|\.github)/[A-Za-z0-9._@+=:,#/-]+)"
)
DIRECTIVE_REQUIRED_PHRASES = {
    "authorising human",
    "linear record",
    "scope",
    "target files",
    "source-use",
    "fresh proof",
    "validation",
    "non-goals",
    "usf-39 remains backlog",
}
DIRECTIVE_WHOLE_PLATFORM_PHRASES = {
    "whole-platform slice readiness pack",
    "human-only acceptance boundary",
    "pre-file slice gate",
    "topology roots",
    "per-slice source-use disposition matrix",
    "proof command",
    "validator extensions",
}
DIRECTIVE_PLACEHOLDER_PHRASES = {
    "required answer",
    "invalid examples",
    "this template does not fill",
    "tbd",
    "todo",
}
AUTHORIZED_IMPLEMENTATION_ROOTS = {
    "apps/mobile",
    "apps/web",
    "apps/api",
    "apps/public-proof-origin",
    "apps/staging-proof-cockpit",
    "apps/work",
    "capabilities/auth",
    "capabilities/tenant",
    "capabilities/audit",
    "capabilities/notify",
    "capabilities/files",
    "capabilities/jobs",
    "capabilities/config",
    "capabilities/bulk",
    "capabilities/search",
    "capabilities/resources",
    "adapters/db",
    "adapters/idp",
    "adapters/store",
    "adapters/bus",
    "adapters/wf",
    "adapters/mail",
    "adapters/secrets",
    "adapters/obs",
    "adapters/assurance",
    "adapters/guardrails",
    "adapters/bulk",
    "adapters/search",
    "adapters/resources",
    "packages/core",
    "packages/ports",
    "packages/contracts",
    "packages/app-surface",
    "packages/client",
    "packages/openapi",
    "packages/test",
    "packages/proof",
    "packages/source",
    "packages/ui",
    "tests/apps",
    "tests/capabilities",
    "tests/adapters",
    "tests/contract",
    "tests/integration",
    "tests/packages",
    "tests/regression",
    "tests/unit",
}


def _is_implementation_path(path):
    return bool(IMPLEMENTATION_PATH_RE.search(path))


def _normalise_path(path):
    path = path.replace("\\", "/")
    while path.startswith("./"):
        path = path[2:]
    return path


def _is_tooling_path(path):
    return bool(
        re.match(r"tools/.*\.(py|mjs|js|sh)$", path)
        or path.startswith(".github/workflows/")
        or re.search(r"(^|/)requirements[^/]*\.txt$", path)
    )


def _normalise_repository_path_value(value):
    if not isinstance(value, str):
        return None
    path = value.strip().strip("`").rstrip(".,;:")
    if not path or path.startswith(("http://", "https://", "urn:", "source:")):
        return None
    if "*" in path or re.search(r"\s", path):
        return None
    path = _normalise_path(path.split("#", 1)[0])
    if path in REPOSITORY_PATH_STANDALONES or REPOSITORY_PATH_RE.match(path):
        return path
    return None


def _repository_path_tokens_in_text(value):
    if not isinstance(value, str) or value.startswith(("http://", "https://", "urn:", "source:")):
        return []
    paths = []
    for match in REPOSITORY_PATH_TOKEN_RE.finditer(value):
        path = _normalise_path(match.group(1).split("#", 1)[0].rstrip(".,;:)]}"))
        if "*" not in path:
            paths.append(path)
    return paths


def _walk_repository_path_values(node, location="$"):
    if isinstance(node, dict):
        for key, value in node.items():
            yield from _walk_repository_path_values(value, f"{location}.{key}")
    elif isinstance(node, list):
        for index, value in enumerate(node):
            yield from _walk_repository_path_values(value, f"{location}[{index}]")
    else:
        path = _normalise_repository_path_value(node)
        if path is not None:
            yield path, location
        else:
            for path in _repository_path_tokens_in_text(node):
                yield path, location


def _path_exists_for_plan(path, existing_paths=None):
    path = _normalise_path(path)
    if existing_paths is not None:
        return path in {_normalise_path(p) for p in existing_paths}
    return os.path.exists(path)


def _plan_inventory_list(F, inventory, key, plan_path):
    value = inventory.get(key)
    if not isinstance(value, list):
        F.add("USF-APPPLAN-001", f"{plan_path}:{key}", "repository path inventory section must be an array")
        return []
    return value


def _plan_inventory_path(item):
    if not isinstance(item, dict):
        return None
    path = item.get("path")
    if not isinstance(path, str):
        return None
    return _normalise_path(path)


def _plan_replacement_paths(item):
    replacements = []
    replacement = item.get("replacementPath") if isinstance(item, dict) else None
    if isinstance(replacement, str):
        replacements.append(_normalise_path(replacement))
    replacement_list = item.get("replacementPaths") if isinstance(item, dict) else None
    if isinstance(replacement_list, list):
        replacements.extend(_normalise_path(path) for path in replacement_list if isinstance(path, str))
    return replacements


def validate_app_surface_implementation_plan_path_inventory(F, plan_path=APP_SURFACE_IMPLEMENTATION_PLAN_PATH,
                                                            record=None, existing_paths=None):
    data = record if record is not None else load_json(plan_path, F)
    if data is None:
        return
    if not isinstance(data, dict):
        F.add("USF-APPPLAN-001", plan_path, "plan root must be an object")
        return

    guard = data.get("pathReferenceGuard")
    if not isinstance(guard, dict):
        F.add("USF-APPPLAN-001", f"{plan_path}:pathReferenceGuard", "path reference guard is missing")
    else:
        required_guard_values = {
            "existingRepositoryPathsMustExist": True,
            "futureToCreatePathsMustHaveOwningLinearIssue": True,
            "invalidOrStalePathReferencesAreNotAuthority": True,
            "guardStatus": "active-for-plan-use",
        }
        for key, expected in required_guard_values.items():
            if guard.get(key) != expected:
                F.add("USF-APPPLAN-001", f"{plan_path}:pathReferenceGuard.{key}", f"expected {expected!r}")

    inventory = data.get("repositoryPathReferenceInventory")
    if not isinstance(inventory, dict):
        F.add("USF-APPPLAN-001", f"{plan_path}:repositoryPathReferenceInventory", "path inventory is missing")
        return

    existing_items = _plan_inventory_list(F, inventory, "existingRepositoryPaths", plan_path)
    future_items = _plan_inventory_list(F, inventory, "futureToCreatePaths", plan_path)
    stale_items = _plan_inventory_list(F, inventory, "removedInvalidOrStaleReferences", plan_path)

    existing_paths = { _normalise_path(p) for p in existing_paths } if existing_paths is not None else None
    classified_existing = set()
    classified_future = set()
    classified_stale = set()
    replacement_paths = set()

    for index, item in enumerate(existing_items):
        subject = f"{plan_path}:repositoryPathReferenceInventory.existingRepositoryPaths[{index}]"
        path = _plan_inventory_path(item)
        if path is None:
            F.add("USF-APPPLAN-001", subject, "existing path item requires a string path")
            continue
        if item.get("classification") != "exists-now":
            F.add("USF-APPPLAN-001", subject, "existing path item must be classified exists-now")
        if path in classified_existing:
            F.add("USF-APPPLAN-001", subject, f"duplicate existing path: {path}")
        classified_existing.add(path)
        if not _path_exists_for_plan(path, existing_paths):
            F.add("USF-APPPLAN-001", subject, f"existing path does not exist: {path}")

    for index, item in enumerate(future_items):
        subject = f"{plan_path}:repositoryPathReferenceInventory.futureToCreatePaths[{index}]"
        path = _plan_inventory_path(item)
        if path is None:
            F.add("USF-APPPLAN-001", subject, "future path item requires a string path")
            continue
        if item.get("classification") != "future-to-create":
            F.add("USF-APPPLAN-001", subject, "future path item must be classified future-to-create")
        owner = item.get("owningLinearIssueId")
        if not isinstance(owner, str) or not re.fullmatch(r"USF-[0-9]+", owner):
            F.add("USF-APPPLAN-001", subject, "future path item requires owningLinearIssueId")
        if path in classified_future:
            F.add("USF-APPPLAN-001", subject, f"duplicate future path: {path}")
        classified_future.add(path)
        if _path_exists_for_plan(path, existing_paths):
            F.add("USF-APPPLAN-001", subject, f"future-to-create path already exists: {path}")

    for index, item in enumerate(stale_items):
        subject = f"{plan_path}:repositoryPathReferenceInventory.removedInvalidOrStaleReferences[{index}]"
        path = _plan_inventory_path(item)
        if path is None:
            F.add("USF-APPPLAN-001", subject, "stale path item requires a string path")
            continue
        if item.get("classification") != "invalid/stale":
            F.add("USF-APPPLAN-001", subject, "stale path item must be classified invalid/stale")
        if path in classified_stale:
            F.add("USF-APPPLAN-001", subject, f"duplicate stale path: {path}")
        classified_stale.add(path)
        if _path_exists_for_plan(path, existing_paths):
            F.add("USF-APPPLAN-001", subject, f"invalid/stale path exists and cannot be treated as removed: {path}")
        replacements = _plan_replacement_paths(item)
        if not replacements:
            F.add("USF-APPPLAN-001", subject, "invalid/stale path requires replacementPath or replacementPaths")
        for replacement in replacements:
            replacement_paths.add(replacement)
            if not _path_exists_for_plan(replacement, existing_paths):
                F.add("USF-APPPLAN-001", subject, f"replacement path does not exist: {replacement}")

    missing_review_paths = sorted(APP_SURFACE_PR306_STALE_PATHS - classified_stale)
    if missing_review_paths:
        F.add("USF-APPPLAN-001", f"{plan_path}:repositoryPathReferenceInventory.removedInvalidOrStaleReferences",
              f"PR 306 stale path audit is missing: {missing_review_paths}")

    known_current_paths = classified_existing | classified_future | replacement_paths
    for path, location in _walk_repository_path_values(data):
        if ".removedInvalidOrStaleReferences[" in location:
            continue
        if path in classified_stale:
            F.add("USF-APPPLAN-001", f"{plan_path}:{location}",
                  f"invalid/stale path leaked into current authority references: {path}")
        elif path in classified_existing:
            if not _path_exists_for_plan(path, existing_paths):
                F.add("USF-APPPLAN-001", f"{plan_path}:{location}", f"existing path does not exist: {path}")
        elif path in classified_future:
            continue
        elif path not in known_current_paths:
            F.add("USF-APPPLAN-001", f"{plan_path}:{location}",
                  f"repository path is not classified in repositoryPathReferenceInventory: {path}")


def _implementation_root(path):
    path = _normalise_path(path)
    parts = path.split("/")
    if not parts or parts[0] not in IMPLEMENTATION_ROOTS:
        return None
    if len(parts) < 2:
        return parts[0]
    return "/".join(parts[:2])


def _has_changed_disposition(changed_paths):
    return any(
        DISPOSITION_MATRIX_RE.match(p)
        or re.match(r"spec/registries/.*source-import-manifest\.json$", p)
        for p in changed_paths
    )


def _implementation_disposition_targets(F, existing_paths=None):
    if existing_paths is None:
        matrix_paths = sorted(glob.glob("docs/architecture/*source-use-disposition-matrix.md"))
    else:
        matrix_paths = sorted(p for p in existing_paths if DISPOSITION_MATRIX_RE.match(p))
    targets = set()
    token_re = re.compile(r"`((?:apps|capabilities|adapters|packages|tests|config)/[^`\s|]+)`")
    for path in matrix_paths:
        if not os.path.exists(path):
            continue
        text = load_text(path, F)
        if text is None:
            continue
        for match in token_re.finditer(text):
            targets.add(_normalise_path(match.group(1).rstrip(".,;:")))
    return targets


def _source_mirror_prefixes(source_paths):
    prefixes = set()
    for source_path in source_paths:
        source_path = _normalise_path(source_path)
        parts = source_path.split("/")
        if len(parts) >= 2 and parts[0] in IMPLEMENTATION_ROOTS:
            prefixes.add("/".join(parts[:2]))
    return prefixes


def _source_mirror_suffixes(source_paths):
    suffixes = set()
    for source_path in source_paths:
        source_path = _normalise_path(source_path)
        parts = source_path.split("/")
        if len(parts) >= 5 and parts[0] in IMPLEMENTATION_ROOTS:
            remainder = "/".join(parts[2:])
            if len(remainder.split("/")) >= 3:
                suffixes.add(remainder)
    return suffixes


def _implementation_directive_referenced(changed_paths, existing_paths=None):
    existing_paths = existing_paths or set()
    all_paths = set(changed_paths) | set(existing_paths)
    return bool(IMPLEMENTATION_DIRECTIVE_PATHS & all_paths)


def _implementation_path_has_forbidden_name(path):
    path = _normalise_path(path)
    return bool(FORB.search(path) or REDUNDANT_USF.search(path))


def validate_implementation_directive_text(F, path, text):
    lower = text.lower()
    missing = sorted(phrase for phrase in DIRECTIVE_REQUIRED_PHRASES if phrase not in lower)
    missing_pack = sorted(phrase for phrase in DIRECTIVE_WHOLE_PLATFORM_PHRASES if phrase not in lower)
    placeholders = sorted(phrase for phrase in DIRECTIVE_PLACEHOLDER_PHRASES if phrase in lower)
    if missing:
        F.add("USF-DIRECTIVE-001", path, f"missing required filled-directive phrases: {missing}")
    if missing_pack:
        F.add("USF-DIRECTIVE-002", path, f"missing whole-platform directive phrases: {missing_pack}")
    if placeholders:
        F.add("USF-DIRECTIVE-001", path, f"placeholder/template phrases remain: {placeholders}")


READINESS_RECONCILIATION_PATH = "docs/architecture/final-v2-readiness-reconciliation.md"
READINESS_STALE_PHRASES = {
    "docs/architecture/complete-readiness-blocker-register.md": [
        "`badef5da0c03a1e019d3f7bb84d8268ee8bc8255`",
        "USF-113: human ratification",
        "run 28285948217 on commit `22db242`",
        "tag proof-anchor-22db242",
    ],
    "docs/architecture/proof-freshness-publication-model.md": [
        "no carrier or signer/trust model is accepted yet",
        "USF-101 is materially advanced",
        "it is not complete. Completion still requires",
    ],
    "docs/architecture/proof-freshness-anchor-carrier-decision.md": [
        "no carrier or signer/trust model is accepted yet",
        "approval-ready",
    ],
    "docs/architecture/foundation-completeness-audit.md": [
        "USF base state reviewed | `badef5da0c03a1e019d3f7bb84d8268ee8bc8255`",
        "USF-113: human ratification",
        "USF-117 status: ledger format + vocabulary defined and documented; validator coverage deferred",
    ],
}
READINESS_REQUIRED_ISSUES = {
    "USF-39", "USF-73", "USF-75", "USF-97", "USF-98", "USF-99", "USF-100",
    "USF-101", "USF-113", "USF-117", "USF-118", "USF-119",
}
READINESS_FORBIDDEN_SCOPE_PHRASES = {
    "authentication only",
    "authentication-only",
    "authentication first slice",
    "authentication first-slice",
    "authentication-centered",
    "auth only",
    "first directive",
    "first extraction",
    "first implementation",
    "first pass",
    "first-pass",
    "first-slice",
    "first slice",
    "first-step",
    "first step",
}


def validate_readiness_reconciliation(F, records=None):
    records = records or {}
    if not os.path.exists(READINESS_RECONCILIATION_PATH) and READINESS_RECONCILIATION_PATH not in records:
        F.add("USF-READINESS-001", READINESS_RECONCILIATION_PATH, "final readiness reconciliation artefact is missing")
    reconciliation = records.get(READINESS_RECONCILIATION_PATH)
    if reconciliation is None and os.path.exists(READINESS_RECONCILIATION_PATH):
        reconciliation = load_text(READINESS_RECONCILIATION_PATH, F)
    if reconciliation is not None:
        missing = sorted(issue for issue in READINESS_REQUIRED_ISSUES if issue not in reconciliation)
        if missing:
            F.add("USF-READINESS-001", READINESS_RECONCILIATION_PATH, f"missing issue status entries: {missing}")
        required_phrases = [
            "USF-100 is an unsigned whole-platform draft directive",
            "USF-39 remains Backlog",
            "NO-GO",
        ]
        missing_phrases = sorted(phrase for phrase in required_phrases if phrase not in reconciliation)
        if missing_phrases:
            F.add("USF-READINESS-001", READINESS_RECONCILIATION_PATH, f"missing required reconciliation phrases: {missing_phrases}")
        # Derive the expected proof-anchor token from the reviewed commit instead of hardcoding a
        # specific commit. This keeps the rule from baking in a stale commit and forces the
        # reconciliation's cited anchor to match its own pinned commit.
        anchor_commit = re.search(r"commit reviewed[^`]*`([0-9a-f]{7,40})`", reconciliation, re.IGNORECASE)
        if not anchor_commit:
            F.add("USF-READINESS-001", READINESS_RECONCILIATION_PATH, "reconciliation does not pin a reviewed repository commit")
        else:
            short = anchor_commit.group(1)[:7]
            if f"proof-anchor-{short}" not in reconciliation:
                F.add("USF-READINESS-001", READINESS_RECONCILIATION_PATH, f"reviewed commit {short} is not matched by a cited proof-anchor-{short}")

    for path, stale_phrases in READINESS_STALE_PHRASES.items():
        text = records.get(path)
        if text is None and os.path.exists(path):
            text = load_text(path, F)
        if text is None:
            continue
        for phrase in stale_phrases:
            if phrase in text:
                F.add("USF-READINESS-001", path, f"stale readiness phrase remains: {phrase}")

    paths = []
    if records:
        paths = sorted(records)
    else:
        paths = sorted(
            glob.glob("docs/architecture/*.md")
            + glob.glob("docs/runbooks/*.md")
            + glob.glob("docs/adr/*.md")
        )
    for path in paths:
        text = records.get(path)
        if text is None and os.path.exists(path):
            text = load_text(path, F)
        if text is None:
            continue
        lower = text.lower()
        for phrase in sorted(READINESS_FORBIDDEN_SCOPE_PHRASES):
            if phrase in lower:
                F.add("USF-READINESS-001", path, f"forbidden auth-first or first-step scope phrase remains: {phrase}")
        # Catch word-order variants the exact-substring set misses, e.g. "first authentication slice",
        # "first authentication implementation slice", "first authorization proof slice". The V2
        # migration is whole-platform/all-slices; no slice may be framed as the "first" one.
        for m in re.finditer(r"first(?:[\s-]+[\w]+){0,3}[\s-]+slice", lower):
            F.add("USF-READINESS-001", path, f"forbidden first-slice scope framing remains: {m.group(0)!r}")


def validate_implementation_directives(F, paths=None, records=None):
    paths = paths or []
    records = records or {}
    for path in sorted(_normalise_path(p) for p in paths):
        if path != IMPLEMENTATION_DIRECTIVE_TEXT_PATH:
            continue
        text = records.get(path)
        if text is None:
            text = load_text(path, F)
        if text is not None:
            validate_implementation_directive_text(F, path, text)


def _validate_implementation_path(F, path, *, directive_referenced, source_mirror_prefixes,
                                  source_mirror_suffixes, disposition_targets):
    root = _implementation_root(path)
    if root is None:
        return
    if not directive_referenced:
        F.add("USF-IMPL-001", path, "implementation artefact requires an authorised implementation directive")
    if path not in disposition_targets:
        F.add("USF-IMPL-002", path, "implementation artefact requires target-file source disposition coverage")
    remainder = "/".join(_normalise_path(path).split("/")[2:])
    mirrored_suffix = next((suffix for suffix in sorted(source_mirror_suffixes) if remainder == suffix), None)
    if root in source_mirror_prefixes or mirrored_suffix:
        detail = f"target root mirrors historical source root {root}" if root in source_mirror_prefixes else f"target suffix mirrors historical source suffix {mirrored_suffix}"
        F.add("USF-IMPL-003", path, detail)
    if _implementation_path_has_forbidden_name(path):
        F.add("USF-IMPL-004", path, "implementation path contains a forbidden canonical token")
    if root not in AUTHORIZED_IMPLEMENTATION_ROOTS:
        F.add("USF-IMPL-005", path, f"{root} is not in the authorised target topology")


def validate_implementation_paths(F, paths, *, changed_paths=None, source_paths=None, existing_paths=None):
    paths = [_normalise_path(p) for p in paths]
    changed_paths = [_normalise_path(p) for p in (changed_paths or [])]
    source_paths = {_normalise_path(p) for p in (source_paths or set())}
    existing_paths = {_normalise_path(p) for p in (existing_paths or set())}
    directive_referenced = _implementation_directive_referenced(changed_paths, existing_paths=existing_paths)
    disposition_targets = _implementation_disposition_targets(F, existing_paths=existing_paths or None)
    mirror_prefixes = _source_mirror_prefixes(source_paths)
    mirror_suffixes = _source_mirror_suffixes(source_paths)
    for path in paths:
        _validate_implementation_path(
            F,
            path,
            directive_referenced=directive_referenced,
            source_mirror_prefixes=mirror_prefixes,
            source_mirror_suffixes=mirror_suffixes,
            disposition_targets=disposition_targets,
        )


def check_implementation(ctx, F):
    validate_app_surface_implementation_plan_path_inventory(F)
    implementation_files = sorted(p for p in _existing_repo_paths() if _is_implementation_path(p))
    directive_files = sorted(p for p in _existing_repo_paths() if p in IMPLEMENTATION_DIRECTIVE_PATHS)
    validate_implementation_directives(F, directive_files)
    if not implementation_files and not directive_files:
        return "not-run"
    validate_implementation_paths(
        F,
        implementation_files,
        changed_paths=[],
        source_paths=_source_import_paths(F),
        existing_paths=_existing_repo_paths(),
    )
    return "ran"


def _is_pr_freshness_governed_record(path, data):
    if path.startswith("evidence/"):
        return True
    return isinstance(data, dict) and data.get("authorityLevel") == "generated-report"


def validate_pr_freshness(F, changed_paths, changed_records=None):
    changed_records = changed_records or {}
    for path in changed_paths:
        if not path.endswith(".json"):
            continue
        if path in changed_records:
            data = changed_records[path]
        elif os.path.exists(path):
            data = load_json(path, F)
        else:
            continue
        if not isinstance(data, dict):
            continue
        if not _is_pr_freshness_governed_record(path, data):
            continue
        freshness = data.get("freshness")
        if isinstance(freshness, dict) and freshness.get("stale") is False:
            F.add(
                "USF-PR-FRESHNESS",
                path,
                "changed evidence/report JSON cannot claim non-stale freshness in a PR; "
                "publish current proof through an accepted post-merge evidence anchor",
            )


def validate_pr_paths(F, name_status_lines, source_paths=None, changed_records=None, existing_paths=None):
    changed_paths = []
    changed_existing_paths = []
    added_paths = []
    existing_paths = _existing_repo_paths() if existing_paths is None else {_normalise_path(p) for p in existing_paths}
    for line in name_status_lines:
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        status, path = parts[0], parts[-1]
        path = _normalise_path(path)
        changed_paths.append(path)
        if not status.startswith("D"):
            changed_existing_paths.append(path)
        if status.startswith("A"):
            added_paths.append(path)
    validate_pr_freshness(F, changed_existing_paths, changed_records=changed_records)
    directive_referenced = _implementation_directive_referenced(changed_paths, existing_paths=existing_paths)
    for path in added_paths:
        path = _normalise_path(path)
        if _is_tooling_path(path) and path not in AUTHORIZED_TOOLING:
            F.add("USF-PR-TOOL", path, "tool/CI added but not in AUTHORIZED_TOOLING (explicit authorisation required)")
        if (_is_implementation_path(path) or re.search(r"\.(ts|tsx|jsx)$", path)) and not directive_referenced:
            F.add("USF-PR-RUNTIME", path, "added file looks like implementation/runtime code")
    validate_implementation_paths(
        F,
        added_paths,
        changed_paths=changed_paths,
        source_paths=source_paths or _source_import_paths(F),
        existing_paths=existing_paths,
    )
    disposition_targets = _implementation_disposition_targets(F)
    for path in added_paths:
        path = _normalise_path(path)
        if _is_implementation_path(path) and path not in disposition_targets:
            F.add("USF-PR-DISPOSITION", path, "added implementation file lacks target-file source disposition coverage")


def load_changed_json_records_at_ref(ref, name_status_lines):
    records = {}
    for line in name_status_lines:
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        status, path = parts[0], _normalise_path(parts[-1])
        if status.startswith("D") or not path.endswith(".json"):
            continue
        try:
            raw = git_checked("show", f"{ref}:{path}")
        except RuntimeError as e:
            print(f"ERROR: pr mode could not read {path} at {ref}: {e}", file=sys.stderr)
            sys.exit(2)
        try:
            records[path] = json.loads(raw)
        except json.JSONDecodeError as e:
            print(f"ERROR: pr mode changed JSON is invalid at {ref}:{path}: {e}", file=sys.stderr)
            sys.exit(2)
    return records


def check_pr(ctx, F, base, head):
    if not base or not head:
        print("ERROR: pr mode requires --base and --head", file=sys.stderr)
        sys.exit(2)
    try:
        diff = git_checked("diff", "--name-status", f"{base}...{head}")
        same = git_checked("rev-parse", base) == git_checked("rev-parse", head)
    except RuntimeError as e:
        print(f"ERROR: pr mode git failure: {e}", file=sys.stderr)
        sys.exit(2)
    if not diff and not same:
        print(f"ERROR: empty diff but {base} and {head} differ (bad refs / missing fetch?)", file=sys.stderr)
        sys.exit(2)
    diff_lines = diff.splitlines()
    changed_records = load_changed_json_records_at_ref(head, diff_lines)
    validate_pr_paths(F, diff_lines, changed_records=changed_records)
    reg_paths = {e["path"] for e in ctx["reg"]["schemas"]}
    for line in diff.splitlines():
        parts = line.split("\t")
        status, path = parts[0], parts[-1]
        if status.startswith("D") and re.match(r"spec/schemas/.*\.schema\.json$", path) and path in reg_paths:
            F.add("USF-PR-DELETE", path, "deleted schema still in registry")
    for e in ctx["reg"]["schemas"]:
        if e["lifecycleState"] == "active":
            F.add("USF-PR-ACTIVE", e["id"], "schema marked active")


def check_bootstrap(F):
    path = "tools/validate-bootstrap/validate-bootstrap.py"
    if not os.path.exists(path):
        F.add("USF-BOOTSTRAP-001", path, "bootstrap validator is missing")
        return "not-run"
    cmd = [sys.executable, path, "all", "--json"]
    completed = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=False)
    if completed.returncode == 2:
        detail = completed.stderr.strip() or completed.stdout.strip() or "bootstrap validator internal error"
        F.add("USF-BOOTSTRAP-001", path, detail)
        return "ran"
    try:
        payload = json.loads(completed.stdout or "{}")
    except json.JSONDecodeError:
        detail = completed.stderr.strip() or completed.stdout.strip() or "bootstrap validator did not emit valid JSON"
        F.add("USF-BOOTSTRAP-001", path, detail)
        return "ran"
    if not isinstance(payload, dict) or "findings" not in payload or not isinstance(payload.get("findings"), list):
        F.add("USF-BOOTSTRAP-001", path, "bootstrap validator emitted invalid JSON shape")
        return "ran"
    for finding in payload.get("findings", []):
        subject = finding.get("subject", path)
        rule = finding.get("ruleId", "unknown")
        message = finding.get("message", "")
        F.add("USF-BOOTSTRAP-001", subject, f"{rule}: {message}")
    if completed.returncode not in (0, 1):
        detail = completed.stderr.strip() or completed.stdout.strip() or "bootstrap validator failed"
        F.add("USF-BOOTSTRAP-001", path, detail)
    if completed.returncode == 1 and not payload.get("findings"):
        F.add("USF-BOOTSTRAP-001", path, "bootstrap validator exited with findings status but emitted no findings")
    return "ran"


def emit_report(ctx, F, path):
    sha = git_checked("rev-parse", "HEAD") if subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True).returncode == 0 else "unknown"
    dirty = bool(subprocess.run(["git", "status", "--porcelain", *DIRTY_PATHS], cwd=ROOT, capture_output=True, text=True).stdout.strip())
    status = "fail" if F.blocking_or_error() else ("advisory" if dirty else "pass")
    vsets = {vs["id"] for vs in ctx["voc"]["valueSets"]}
    vocab_refs = [v for v in ("validation-severities", "report-statuses") if v in vsets] or sorted(vsets)[:1]
    tax_refs = sorted(ctx["tax_ids"])[:1] or ["governance"]
    report = {
        "id": "usf.validator-report.spec", "title": "USF Spec Validator Report",
        "description": "Generated validator report for the USF spec corpus produced by tools/validate-spec/validate-spec.py. "
                       "Rank-7 generated-report; never overrides evidence or semantics.",
        "authorityLevel": "generated-report", "status": status, "lifecycleState": "draft",
        "ontologyConcepts": ["Validator", "Generated Report"], "taxonomyRefs": tax_refs, "vocabularyRefs": vocab_refs,
        "aiGuidance": "Lowest authority. A pass means the checked rules held at this commit; it does not certify modelling correctness.",
        "findings": list(F.items),
        "evidenceRefs": [f"commit:{sha}", "spec/schemas", "spec/registries/schema-registry.json"],
        "freshness": {"commit": sha, "stale": dirty},
    }
    errs = list(Draft202012Validator(ctx["sd"]["validator-report"]).iter_errors(report))
    if errs:
        print(f"ERROR: emitted report does not conform to validator-report.schema.json: {errs[0].message}", file=sys.stderr)
        sys.exit(2)
    with open(path, "w") as fh:
        json.dump(report, fh, indent=2)
    print(f"wrote validator-report instance: {path} (status={status})")


def main():
    ap = argparse.ArgumentParser(description="USF spec validator (fail-closed).")
    ap.add_argument("mode", nargs="?", default="all",
                    choices=["schemas", "enums", "catalogues", "registry", "fixtures", "instances", "imports", "evidence", "real-instances", "implementation", "bootstrap", "selftest", "pr", "anchor", "all"])
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--report")
    ap.add_argument("--base")
    ap.add_argument("--head")
    ap.add_argument("--anchor-file", help="proof-freshness anchor payload JSON to verify (anchor mode)")
    a = ap.parse_args()

    F = Findings()
    ctx = build_ctx(F)
    if ctx is None:
        for f in F.items:
            print(f"  [{f['severity']}] {f['ruleId']} {f['subject']}: {f['message']}")
        print("USF validator: corpus could not be loaded (fail-closed).")
        sys.exit(1)

    fixtures_state = selftest_state = None
    real_instances_state = None
    pr_requested = a.base is not None or a.head is not None
    run = {
        "schemas": ["schemas"], "enums": ["enums"], "catalogues": ["catalogues"], "registry": ["registry"],
        "fixtures": ["fixtures"], "instances": ["instances"], "imports": ["imports"], "evidence": ["evidence"],
        "real-instances": ["real-instances"], "implementation": ["implementation"], "bootstrap": ["bootstrap"],
        "selftest": ["selftest"], "pr": ["pr"], "anchor": ["anchor"],
        "all": ["schemas", "enums", "catalogues", "registry", "safety", "readiness", "fixtures", "instances", "imports", "evidence", "real-instances", "implementation", "bootstrap", "selftest"]
               + (["pr"] if pr_requested else []),
    }[a.mode]
    if "schemas" in run:
        check_schemas(ctx, F)
    if "enums" in run:
        check_enums(ctx, F)
    if "catalogues" in run:
        check_catalogues(ctx, F)
    if "registry" in run:
        check_registry(ctx, F)
    if "safety" in run:
        check_safety(ctx, F)
    if "readiness" in run:
        validate_readiness_reconciliation(F)
    if "fixtures" in run:
        fixtures_state = check_fixtures(ctx, F)
    if "instances" in run:
        check_instances(ctx, F)
    if "imports" in run:
        check_imports(ctx, F)
    if "evidence" in run:
        check_evidence(ctx, F)
    if "real-instances" in run:
        real_instances_state = check_real_instances(ctx, F)
    if "implementation" in run:
        check_implementation(ctx, F)
    if "bootstrap" in run:
        check_bootstrap(F)
    if "selftest" in run:
        selftest_state = check_selftest(ctx, F)
    if "pr" in run:
        check_pr(ctx, F, a.base or "main", a.head or "HEAD")
    if "anchor" in run:
        if not a.anchor_file:
            print("ERROR: anchor mode requires --anchor-file", file=sys.stderr)
            sys.exit(2)
        anchor_data = load_json(a.anchor_file, F)
        try:
            anchor_commit = a.head or git_checked("rev-parse", "HEAD")
        except Exception:
            anchor_commit = None
        if anchor_data is not None:
            validate_anchor_payload_data(F, {a.anchor_file: anchor_data}, current_commit=anchor_commit)

    if a.report:
        emit_report(ctx, F, a.report)

    if a.json:
        print(json.dumps({"mode": a.mode, "schemaCount": len(ctx["sd"]), "findings": F.items}, indent=2))
    else:
        counts = dict(Counter(f["ruleId"] for f in F.items))
        head = f"USF validator [{a.mode}]: " + ("CLEAN" if not F.items else json.dumps(counts))
        for label, st in (("fixtures", fixtures_state), ("selftest", selftest_state)):
            if st == "not-run":
                head += f"  ({label}: none present)"
        if real_instances_state:
            skipped = sorted(k for k, st in real_instances_state.items() if st == "not-run")
            if skipped:
                head += f"  (real-instances optional not present: {', '.join(skipped)})"
        print(head)
        for f in F.items:
            print(f"  [{f['severity']}] {f['ruleId']} {f['subject']}: {f['message']}")
    sys.exit(1 if F.blocking_or_error() else 0)


if __name__ == "__main__":
    main()
