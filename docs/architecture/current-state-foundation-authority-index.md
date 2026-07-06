# Current-State Foundation Authority Index

|                     |                                                                 |
| ------------------- | --------------------------------------------------------------- |
| **Issue scope**     | USF-230                                                         |
| **Baseline tag**    | `v2-foundation`                                                |
| **Strategy source** | `docs/architecture/post-foundation-optimisation-strategy.json` |
| **Evidence report** | `docs/architecture/foundation-optimisation-evidence.json` |
| **Status**          | Current-state routing index for future developer and AI work    |

This index is the current-state routing layer created after the `v2-foundation` baseline. It keeps superseded parity evidence available for lineage, but directs future developer and AI-agent work toward the current semantic corpus, accepted decisions, validators, proofs, evidence, and handover artefacts.

This document does not remove historical evidence, change runtime behaviour, weaken validators, or create a readiness claim beyond the bounded dev-readiness baseline already evidenced by USF-226 through USF-228.

## Current Authority Entry Points

Future work should start with these current artefacts:

| Authority area | Current entry points | Use |
| -------------- | -------------------- | --- |
| Constitutional and semantic authority | `docs/architecture/charter.md`, `docs/architecture/authority-model.md`, `docs/architecture/standards-profile.md`, `docs/architecture/ontology.md` | Defines platform meaning and authority order. |
| Governance standards | `docs/architecture/directory-and-file-naming-standard.md`, `docs/architecture/schema-authoring-standard.md`, `docs/architecture/git-practices-standard.md` | Defines naming, schema, and Git practice constraints. |
| Machine-readable catalogues | `spec/taxonomies/taxonomy-catalog.json`, `spec/vocabularies/vocabulary-catalog.json`, `spec/registries/schema-registry.json` | Defines controlled classifications, values, and registered schema lifecycle. |
| Semantic corpus | `spec/instances/**`; see "Spec Instance Family Coverage" below | Defines current service, capability, provider, environment, command, workflow, UI-semantic, audit, observability, enterprise, and AI-governance semantics. |
| Decisions | `docs/adr/` | Records accepted decisions and constraints. |
| Validation | `tools/validate-spec/`, `tools/validate-bootstrap/`, `tools/validate-parity/`, `tools/validate-enterprise/`, `tools/validate-runtime/`, `tools/validate-compose/` | Enforces consistency and fail-closed boundaries. |
| Proofs | `packages/proof/`, `spec/instances/runtime-proof/`, proof scripts in `package.json` and `Makefile` | Provides executable evidence for bounded local and composed foundation behaviour. |
| Enterprise evidence | `spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json`, `docs/architecture/enterprise-evidence-model.md` | Organises risk, control, evidence, exception, and non-claim posture. |
| Dev handover | `README.md#developer-quickstart`, `docs/architecture/dev-readiness-validation-and-handover.md`, `docs/architecture/dev-readiness-validation-and-handover.json` | Gives the current developer and AI-agent bootstrap, validation, and contribution path. |
| Test-readiness command gate | `docs/architecture/test-readiness-command-surface-and-ci-gate.md`, `docs/architecture/test-readiness-command-surface-and-ci-gate.json`, `make test-ready` | Routes current test-readiness validation through composed semantic proof, deterministic fixture proof, and bounded assurance proof without replacing USF-234 final acceptance. |
| Baseline evidence | `docs/architecture/dev-ready-foundation-baseline-tag.md`, `docs/architecture/dev-ready-foundation-baseline-tag.json` | Records the immutable `v2-foundation` baseline tag and its governance exception. |

## Spec Instance Family Coverage

The current authority index covers every committed `spec/instances` family. A new family MUST be added here and to `docs/architecture/current-state-foundation-authority-index.json` before it is treated as routed current-state authority.

| Family | Current path | Validator |
| ------ | ------------ | --------- |
| AI governance | `spec/instances/ai-governance/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Audit events | `spec/instances/audit-event/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Bootstrap mappings | `spec/instances/bootstrap-mapping/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Commands | `spec/instances/command/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Compose services | `spec/instances/compose-service/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Configuration | `spec/instances/configuration/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Data migrations | `spec/instances/data-migration/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Enterprise evidence | `spec/instances/enterprise-evidence/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Environments | `spec/instances/environment/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Environment promotion | `spec/instances/environment-promotion/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Event contracts | `spec/instances/event-contract/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Interface contracts | `spec/instances/interface-contract/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Observability signals | `spec/instances/observability-signal/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Provider modes | `spec/instances/provider-mode/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Runtime proofs | `spec/instances/runtime-proof/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Semantic contracts | `spec/instances/semantic-contract/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| UI semantic models | `spec/instances/ui-semantic-model/` | `python3 tools/validate-spec/validate-spec.py instances --json` |
| Workflows | `spec/instances/workflow/` | `python3 tools/validate-spec/validate-spec.py instances --json` |

## USF-292 Closure Seal Records

USF-292 sealed the current-state foundation substrate closure posture. These records are current closure evidence, not product, staging, production, SOC, ISO certification, enterprise production, browser E2E, or full-product readiness claims:

| Seal record | Path |
| ----------- | ---- |
| Current-state closure record | `docs/architecture/usf-current-state-foundation-closure-record.json` |
| Current-state closure report | `docs/architecture/usf-current-state-foundation-closure-report.md` |
| Retirement scan | `docs/architecture/usf-current-state-foundation-closure-reference-retirement-scan.json` |
| Retirement scan report | `docs/architecture/usf-current-state-foundation-closure-reference-retirement-scan.md` |
| Superseded lineage provenance | `docs/architecture/superseded-lineage-closure-provenance.json` |
| Superseded lineage provenance report | `docs/architecture/superseded-lineage-closure-provenance.md` |

## Staleness Propagation

When a semantic instance family, closure seal record, proof, evidence item, or generated report changes, dependent proof evidence, generated reports, external review surfaces, and prior human decisions MUST be treated as superseded or stale until refreshed against the changed commit. Generated reports MUST NOT upgrade stale, unknown, missing, or superseded raw evidence to pass or current-state status.

## AI/UI Composition Boundary

Future AI-agent UI-definition work MAY consume the semantic corpus, accepted ADRs, validators, runtime proof evidence, enterprise evidence, and this authority index as inputs. It MUST remain proposal-level until semantic definitions, validators, proof evidence, enterprise evidence, and human review are updated and accepted. This index does not claim product UI readiness, browser E2E readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, or full product readiness.

## Reclassified Lineage And Scaffolding

The following artefacts remain retained evidence, but are not future active authority by themselves:

| Artefact group | Current posture | Future-use rule |
| -------------- | --------------- | --------------- |
| Superseded external-lineage source and references | Historical lineage and source evidence | Inspect only when a current issue or authority artefact requires source lineage; do not copy or mirror runtime/application paths. |
| Source-use and parity matrices | Historical-lineage evidence | Use for audit traceability and source disposition, not as a direct implementation recipe. |
| Complete source lineage-to-USF parity reviews | Historical-lineage evidence | Use to understand completed reconciliation; do not infer full product readiness. |
| USF-133 closure-tier and lane orchestration artefacts | Transitional scaffolding and audit evidence | Use for audit trail only; do not treat wrapper completion as source issue completion or future readiness authority. |
| Bootstrap mapping and bootstrap-readiness artefacts | Lineage and foundation ancestry | Use to preserve ancestry and source coverage, not to drive future implementation naming or readiness claims. |
| Generated Compose outputs | Generated projections | Regenerate from the service catalogue and generator; do not treat generated files as semantic authority. |

No files are removed by this optimisation pass. USF-230 reconciles the active path by indexing and reclassifying artefacts, preserving lineage until a later issue has replacement evidence, archive rationale, and validation for any physical removal.

## Future Developer And AI Workflow

Future changes should follow this current-state path:

1. Read the current agent directive and foundational artefacts from disk.
2. Read the relevant current semantic instance, schema, ADR, validator, proof manifest, and enterprise evidence row.
3. Use superseded external-lineage, source-use, parity, closure, and bootstrap artefacts only as lineage or audit inputs when the current issue explicitly needs them.
4. Update semantic contracts, proofs, validators, planted defects, and enterprise evidence together when behaviour or assurance posture changes.
5. Run targeted validation during development and the issue-required full gate before PR ready state.
6. Record PR, merge SHA, validation, Linear acceptance mapping, and non-claims before Done.

## Preservation Commitments

USF-230 preserves or improves assurance by making the active path clearer without deleting evidence:

- semantic authority remains unchanged;
- validators and planted defects remain unchanged;
- proof commands remain unchanged;
- runtime behaviour remains unchanged;
- generated Compose remains derivative;
- historical lineage remains retained;
- dev-readiness handover remains the developer entry point;
- the `v2-foundation` tag remains the immutable baseline for this optimisation track.

## Non-Claims

This current-state index does not claim test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full product readiness.
