# Source Import Coverage Plan

| | |
|---|---|
| **Document type** | Architecture / import coverage planning |
| **Status** | Draft / planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter and Authority Model |
| **Issue scope** | USF-47; supports USF-33 |
| **Source lineage basis** | USF's own self-defined source lineage at commit `a92d9734cf0f1f7a53f9093ce3bb3d2c02bfd767`, tags `v1-final` and `v2-l6-foundation-proven` |

This document defines the coverage boundary for source-evidence records before detailed per-domain import-manifest records are authored. This planning document alone creates no source import map; the baseline manifest is authored separately at `spec/registries/source-import-manifest.json`. The plan imports no runtime/application code and does not treat USF's own source lineage as live authority.

## Purpose

USF must preserve source lineage and avoid silent source loss. The controlled source import map in USF-33 will be generated from historical evidence only after coverage classes, coverage units, exclusions, and decomposition are explicit.

## Governing Rules

- The Charter requires no knowledge loss and treats USF's own source lineage as evidence.
- The Authority Model places USF source implementation at rank 5, below USF semantic definitions, ADRs, validators, and runtime proof evidence.
- The Standards Profile requires source references and dispositions for imported source elements.
- `spec/schemas/import-manifest.schema.json`, `spec/schemas/source-reference.schema.json`, and `spec/schemas/source-disposition.schema.json` define draft instance shapes.
- Source paths held in USF's own source-import registry MUST remain quoted source evidence and MUST NOT dictate USF target paths.
- Historical disposition aliases MUST resolve to canonical `disposition-values` before being emitted in USF JSON instances.

## Historical Inputs

The coverage plan is grounded in USF's own self-defined source-lineage artefacts:

| Source-lineage artefact | Observed coverage role |
|---|---|
| USF's own v1 file inventory | 1,673 source elements with path, file type, owner, authority marker, disposition, retained interfaces, tests, decisions, migration sequence, and deletion condition |
| USF's own v1-to-v2 path map | 1,673 mapped source elements using the same source-element shape |
| USF's own v2 decision catalogue | 74 accepted decisions |
| USF's own v2 decision lineage | 74 decision lineage records |
| USF's own v1 capability closure | 75 capability records with semantic completeness, source references, and proof links |
| USF's own capability proof definition | Proof ladder and proof-definition semantics |
| USF's own operational semantics | 75 operational capability records and 92 runtime command links |
| USF's own event semantics | 10 event semantic records |
| USF's own cross-capability interactions | 10 cross-capability interaction records |
| USF's own UI capability model | 12 personas and 28 UI capability records |

## Coverage Classes

The source import map MUST cover these source evidence classes:

| Coverage class | Unit of coverage | Import-manifest sourceKind | Primary sourceRole |
|---|---|---|---|
| Source files and modules | One inventory row for each source/module file | `source-file` or `module` | `behavioural-evidence` or `semantic-source` |
| Applications and packages | One inventory row for each application/package root or package metadata file | `application` or `package` | `behavioural-evidence` |
| Documentation and architecture records | One inventory row for each historical document | `documentation` | `historical-lineage` or `semantic-source` |
| Historical ADRs and decision lineage | One decision record and one lineage record per historical decision | `documentation` or `semantic-artefact` | `historical-lineage` |
| Semantic artefacts | One semantic artefact or semantic record as applicable | `semantic-artefact`, `operational-semantic`, `event-semantic`, or `ui-semantic` | `semantic-source` |
| Make targets and package scripts | One command unit per target or script where inventories expose it; otherwise one file row plus later command decomposition | `make-target` or `package-script` | `command-evidence` |
| Configuration and environment assets | One file, key, or environment variable unit as appropriate | `configuration-file`, `configuration-key`, or `environment-variable` | `configuration-evidence` |
| Compose services and providers | One service unit per compose/provider definition | `compose-service` | `operational-evidence` |
| Tests and e2e journeys | One test file, suite, scenario, persona, or journey registry unit | `test` or `e2e-journey` | `behavioural-evidence` |
| Proof scripts and proof evidence | One proof script or proof record unit | `proof-script` | `proof-evidence` |
| Generated reports | One generated report unit, always lower authority than raw evidence | `generated-report` | `generated-summary-evidence` |
| Data and migration artefacts | One migration, seed, reset, data-plan, or data evidence unit | `data-migration-artefact` | `data-evidence` |
| Observability and audit artefacts | One observability, tracing, logging, metric, audit, or correlation unit | `observability-audit-artefact` | `observability-audit-evidence` |
| Readiness gates and operational semantics | One gate, readiness check, or operational semantic unit | `readiness-gate` or `operational-semantic` | `operational-evidence` |

## Coverage Rules

- Every row in `v1-file-inventory.json` is in scope for no-loss accounting unless a later accepted ADR narrows the boundary with rationale.
- Every row in `v1-to-v2-path-map.json` is in scope for reconciliation against the file inventory; mismatches are findings, not silent exclusions.
- Every accepted historical decision in `v2-decision-catalog.json` MUST have a matching lineage record in `v2-decision-lineage.json` before it can support a USF ADR.
- Every capability in `v1-capability-closure.json` is a semantic-source coverage unit for later semantic contract import.
- Runtime command links, events, cross-capability interactions, and UI capability records are coverage units even when they do not correspond one-to-one with files.
- Generated reports are covered only as generated-summary evidence. They MUST NOT be treated as canonical or as proof without underlying evidence.
- Historical paths may contain forbidden tokens only inside source-reference fields or quoted evidence.
- Historical disposition aliases must map to canonical USF disposition values:
  - `reuse-unchanged` -> `preserve`
  - `git-move` -> `rename`
  - `refactor-behind-contract` -> `refactor`
  - `replace-retain-contract` -> `replace`
  - `regenerate` -> `replace`
  - `archive-evidence` -> `retire`
  - `delete-after-proof` -> `retire`
  - `split` -> `split`
  - `merge` -> `merge`
- A disposition records treatment of historical evidence; it does not imply implementation acceptance.
- A target USF concept MUST be an ontology concept or governed semantic concern, not a mirrored source path.
- The future no-loss validator MUST fail closed when a covered unit lacks a disposition, has no rationale, uses a non-canonical disposition value, or reuses a historical source path as a USF target path.

## Exclusions

The following are excluded from source-import coverage unless a later issue explicitly brings them into scope:

| Exclusion | Rationale |
|---|---|
| Source-lineage `.git/**` internals | Git internals are not source artefacts; commit and tag identifiers provide lineage instead |
| Source-lineage `node_modules/**` | Third-party installed dependencies are not authored source; package manifests capture dependency intent |
| Local caches and tool scratch state such as `.scannerwork/**`, `.playwright-mcp/**`, `.serena/**`, `.swarm/**`, and similar local state | These are generated or local operational byproducts, not canonical source evidence |
| Secret-bearing local files such as `.password` and generated `.env` secret material | Secrets MUST NOT be imported; only configuration contract semantics are in scope |
| Coverage output directories such as `coverage/**` and e2e runtime result output unless referenced by governed evidence records | Generated output is lower authority and must be linked to raw evidence before it can support a claim |

An exclusion is not deletion. If an excluded element appears in the historical file inventory, the import manifest MUST still record an explicit `reject`, `retire`, or `defer` disposition with rationale.

## Decomposition Plan

The USF-33 import map should be decomposed in this order:

1. Inventory baseline manifest: generate a manifest from all 1,673 `v1-file-inventory.json` rows using canonical disposition values and source-kind/source-role mapping. This baseline is now represented by `spec/registries/source-import-manifest.json`.
2. Path-map reconciliation: compare the baseline manifest with `v1-to-v2-path-map.json` and report mismatches. The source-path set matches the inventory; mapped-field differences remain historical reconciliation evidence and do not create USF target paths.
3. Decision lineage manifest: map the 74 accepted historical decisions and 74 lineage records to future USF ADR work.
4. Semantic corpus manifests: decompose capabilities, operational semantics, events, interactions, UI semantics, provider/environment semantics, and proof definitions into per-domain manifests.
5. Command and configuration manifests: decompose Make targets, package scripts, environment manifests, configuration keys, and compose services.
6. Evidence and proof manifests: decompose raw evidence, runtime proof evidence, generated reports, and attestations while preserving authority distinctions.
7. Implementation extraction manifests: only after semantic contracts and import dispositions exist, map application/package/service implementation elements behind preserved contracts.

## Validation Expectations

- Strict JSON parse for all future import-manifest, source-reference, and source-disposition instances.
- Schema validation against the three draft source/import schemas.
- A no-loss check proving every covered source unit has exactly one disposition and rationale.
- A canonical-value check proving no historical disposition alias is emitted as a canonical value.
- A path-safety check proving source paths appear only as source references and are not used as target USF paths.
- `tools/validate-spec/validate-spec.py imports` validates the committed baseline manifest as a repeatable repository-owned check, including schema validity, entry count, unique source paths, canonical controlled values, path safety, package metadata classification, and runtime proof script classification.
- Reconciliation against USF's own source lineage remains a documented manual evidence step until a later source-evidence harness is authorised.

## Non-Goals

- No runtime or application code import.
- No schema promotion to `active`.
- No generated readiness claim.
- No Linear status mutation.
- No semantic corpus import beyond defining the coverage boundary.

## Readiness

This plan satisfies the USF-47 planning boundary. The USF-33 baseline inventory manifest now exists at `spec/registries/source-import-manifest.json` and uses inline source references and dispositions under `spec/schemas/import-manifest.schema.json`. Further per-domain manifests for decisions, semantic records, commands, configuration, evidence, proof, and later implementation extraction remain deferred until explicitly authorised.
