# Current-State Foundation Authority Index

|                     |                                                                 |
| ------------------- | --------------------------------------------------------------- |
| **Issue scope**     | USF-230                                                         |
| **Baseline tag**    | `v2-foundation`                                                |
| **Strategy source** | `docs/architecture/post-foundation-optimisation-strategy.json` |
| **Evidence report** | `docs/architecture/foundation-optimisation-evidence.json` |
| **Status**          | Current-state routing index for future developer and AI work    |

This index is the current-state routing layer created after the `v2-foundation` baseline. It keeps historical foundation and React-parity evidence available for lineage, but directs future developer and AI-agent work toward the current semantic corpus, accepted decisions, validators, proofs, evidence, and handover artefacts.

This document does not remove historical evidence, change runtime behaviour, weaken validators, or create a readiness claim beyond the bounded dev-readiness baseline already evidenced by USF-226 through USF-228.

## Current Authority Entry Points

Future work should start with these current artefacts:

| Authority area | Current entry points | Use |
| -------------- | -------------------- | --- |
| Constitutional and semantic authority | `docs/architecture/charter.md`, `docs/architecture/authority-model.md`, `docs/architecture/standards-profile.md`, `docs/architecture/ontology.md` | Defines platform meaning and authority order. |
| Governance standards | `docs/architecture/directory-and-file-naming-standard.md`, `docs/architecture/schema-authoring-standard.md`, `docs/architecture/git-practices-standard.md` | Defines naming, schema, and Git practice constraints. |
| Machine-readable catalogues | `spec/taxonomies/taxonomy-catalog.json`, `spec/vocabularies/vocabulary-catalog.json`, `spec/registries/schema-registry.json` | Defines controlled classifications, values, and registered schema lifecycle. |
| Semantic corpus | `spec/instances/semantic-contract/`, `spec/instances/compose-service/service-catalogue.json`, `spec/instances/environment-promotion/environment-promotion-enterprise-standard.json` | Defines current service, capability, provider, and environment semantics. |
| Decisions | `docs/adr/` | Records accepted decisions and constraints. |
| Validation | `tools/validate-spec/`, `tools/validate-bootstrap/`, `tools/validate-parity/`, `tools/validate-enterprise/`, `tools/validate-runtime/`, `tools/validate-compose/` | Enforces consistency and fail-closed boundaries. |
| Proofs | `packages/proof/`, `spec/instances/runtime-proof/`, proof scripts in `package.json` and `Makefile` | Provides executable evidence for bounded local and composed foundation behaviour. |
| Enterprise evidence | `spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json`, `docs/architecture/enterprise-evidence-model.md` | Organises risk, control, evidence, exception, and non-claim posture. |
| Dev handover | `README.md#developer-quickstart`, `docs/architecture/dev-readiness-validation-and-handover.md`, `docs/architecture/dev-readiness-validation-and-handover.json` | Gives the current developer and AI-agent bootstrap, validation, and contribution path. |
| Test-readiness command gate | `docs/architecture/test-readiness-command-surface-and-ci-gate.md`, `docs/architecture/test-readiness-command-surface-and-ci-gate.json`, `make test-ready` | Routes current test-readiness validation through composed semantic proof, deterministic fixture proof, and bounded assurance proof without replacing USF-234 final acceptance. |
| Baseline evidence | `docs/architecture/dev-ready-foundation-baseline-tag.md`, `docs/architecture/dev-ready-foundation-baseline-tag.json` | Records the immutable `v2-foundation` baseline tag and its governance exception. |

## Reclassified Lineage And Scaffolding

The following artefacts remain retained evidence, but are not future active authority by themselves:

| Artefact group | Current posture | Future-use rule |
| -------------- | --------------- | --------------- |
| Historical React source and references | Historical lineage and source evidence | Inspect only when a current issue or authority artefact requires source lineage; do not copy or mirror runtime/application paths. |
| Source-use and parity matrices | Historical-lineage evidence | Use for audit traceability and source disposition, not as a direct implementation recipe. |
| Complete React-to-USF parity reviews | Historical-lineage evidence | Use to understand completed reconciliation; do not infer full React product parity. |
| USF-133 closure-tier and lane orchestration artefacts | Transitional scaffolding and audit evidence | Use for audit trail only; do not treat wrapper completion as source issue completion or future readiness authority. |
| Bootstrap mapping and bootstrap-readiness artefacts | Lineage and foundation ancestry | Use to preserve ancestry and source coverage, not to drive future implementation naming or readiness claims. |
| Generated Compose outputs | Generated projections | Regenerate from the service catalogue and generator; do not treat generated files as semantic authority. |

No files are removed by this optimisation pass. USF-230 reconciles the active path by indexing and reclassifying artefacts, preserving lineage until a later issue has replacement evidence, archive rationale, and validation for any physical removal.

## Future Developer And AI Workflow

Future changes should follow this current-state path:

1. Read the current agent directive and foundational artefacts from disk.
2. Read the relevant current semantic instance, schema, ADR, validator, proof manifest, and enterprise evidence row.
3. Use historical React, source-use, parity, closure, and bootstrap artefacts only as lineage or audit inputs when the current issue explicitly needs them.
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

This current-state index does not claim test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full React product parity.
