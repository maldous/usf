# Post-Foundation Optimisation and Minimalisation Strategy

|                     |                                                                                 |
| ------------------- | ------------------------------------------------------------------------------- |
| **Issue scope**     | USF-229                                                                         |
| **Execution issue** | USF-230                                                                         |
| **Baseline tag**    | `v2-foundation`                                                                |
| **Baseline commit** | `4a4eb129bf8d441be512cc3a976d2d2004a4a250`                                      |
| **Evidence record** | `docs/architecture/post-foundation-optimisation-strategy.json`                  |
| **Status**          | Strategy only. No destructive optimisation or runtime behaviour change is made. |

This strategy defines how the repository should move from evolution-heavy foundation evidence into an optimal current-state development foundation after the `v2-foundation` baseline. It keeps the same or stronger semantic confidence while reducing future reliance on historical migration scaffolding.

The `v2-foundation` tag remains a one-off annotated baseline tag. The tag does not create a general naming exception and does not claim test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full product readiness.

## Strategy Boundary

USF-229 is planning and strategy only. It does not remove files, change runtime behaviour, change provider bindings, weaken validators, rewrite evidence, or redefine semantic authority.

USF-230 is the existing execution issue. No additional child issue is necessary at strategy time because USF-230 can execute the grouped plan. USF-230 must create or link a child issue later if execution finds separate ownership, risk, or validation boundaries.

## Current Inventory

The repository inventory at the start of USF-229 is:

| Artefact class                       | Count |
| ------------------------------------ | ----: |
| Schemas                              |    28 |
| Semantic instances                   |   160 |
| Registries                           |     4 |
| Taxonomies                           |     1 |
| Vocabularies                         |     1 |
| Architecture Markdown files          |   119 |
| Architecture JSON files              |    55 |
| ADRs                                 |    14 |
| Validators                           |    23 |
| Planted defect files                 |   510 |
| Generated Compose files              |     4 |
| Proof source files                   |    37 |
| Package scripts                      |    70 |
| Proof scripts                        |    33 |
| Compose scripts                      |    17 |
| Runtime scripts                      |     4 |
| Dev-readiness handover artefacts     |     2 |
| Foundation baseline tag artefacts    |     2 |
| Historical or evolution marker files |   384 |

The marker count is a search signal, not a readiness finding. It identifies files containing historical source lineage, bootstrap wording, closure-tier wording, parity migration language, or equivalent evolution markers that USF-230 should classify before changing.

## Disposition Matrix

| Artefact class | Classification | Optimisation disposition |
| -------------- | -------------- | ------------------------ |
| Constitutional and agent governance | canonical-current | Retain as current authority. Do not weaken AGENTS, CODEX, the Charter, or the Authority Model. |
| Foundational standards and catalogues | canonical-current | Retain. Future workflow should point to these before historical migration evidence. |
| Schemas | canonical-current | Retain. Document lifecycle state if needed, but do not reduce schema coverage. |
| Semantic instances | canonical-current | Retain as current semantic corpus, including service catalogue, runtime proof, and environment promotion instances. |
| Source-use and parity matrices | historical-lineage | Retain as lineage until USF-230 creates a current authority index and confirms replacement traceability. |
| Closure and lane orchestration gates | transitional-scaffolding | Keep as historical audit evidence, but remove them from future developer decision paths. |
| Enterprise evidence and assurance model | canonical-current | Retain. Preserve control, risk, exception, and non-claim evidence. |
| Proof manifests and proof commands | canonical-current | Retain. Do not remove commands without validator-backed disposition and replacement evidence. |
| Validators and planted defects | canonical-current | Retain. Any consolidation must prove equivalent fail-closed coverage. |
| Generated Compose outputs | generated | Retain as deterministic projections; the service catalogue remains authority. |
| Dev-readiness handover and baseline evidence | canonical-current | Retain as current handover and baseline evidence. |
| Promotion and production-shaped posture documents | canonical-current | Retain as non-claim and promotion posture. Do not turn posture into readiness. |
| Duplicate or stale surfaces | redundant | Candidate only. USF-230 must identify concrete files and replacement evidence before archive or removal. |
| Removable artefacts | removable | None are safe to remove during USF-229. |

## Legacy and Evolution Findings

USF's own recorded source lineage remains valid as rank-5 source evidence only. It must not drive future implementation by source resemblance. USF-230 should move future agent workflows toward current semantic contracts, validators, proof commands, and dev-readiness handover evidence.

Bootstrap evolution wording remains useful for ancestry and should be treated as historical lineage. It should not be an active source of future development meaning.

USF-133 closure-tier, lane, and final reconciliation artefacts remain useful audit evidence. They must not imply future readiness, source issue completion, or current implementation authority.

React parity and complete-react-to-USF artefacts document how the foundation was reconciled from historical source. They are not full product readiness claims. USF-230 should introduce a current capability and proof index so new work starts from present contracts and validators.

## Canonical Current-State Authority Model

Future developer and AI-agent work should use this order:

1. Constitutional and semantic authority: Charter, Authority Model, standards, catalogues, schemas, and spec instances.
2. ADRs: accepted decisions and constraints.
3. Validators: fail-closed enforcement.
4. Runtime and proof evidence: commit-pinned evidence and proof manifests.
5. Source implementation and source lineage: apps, packages, and adapters that conform to the above, together with USF's own source-import registry, source-use matrices, and source-disposition matrices as audit/reference evidence only.
6. Generated reports: summaries and deterministic projections only.

## Safety Rules

USF-230 must preserve or strengthen semantic confidence, proof coverage, validators, planted defects, evidence quality, and dev-readiness guidance.

No historical lineage may be removed unless current authority, archive rationale, and validation evidence exist.

No runtime behaviour may change unless a separate issue explicitly authorises it.

No source-use or parity evidence may be removed from the active path until current-state evidence provides equivalent or stronger traceability.

Generated outputs remain derivative and must not outrank the semantic service catalogue or proof evidence.

Every readiness boundary must preserve explicit non-claims.

## Preservation Plan

The following commands remain required preservation gates for USF-230 unless that issue records and validates a stronger replacement:

- `make verify`
- `corepack pnpm parity`
- `python3 tools/validate-spec/validate-spec.py all --json`
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD --json`
- `python3 tools/validate-bootstrap/validate-bootstrap.py all --json`
- `python3 tools/validate-parity/validate-parity.py all --json`
- `python3 tools/validate-enterprise/validate-enterprise.py all --json`

Planted-defect coverage remains required. USF-230 may consolidate duplicated negative controls only after proving each rule still fails closed.

Commit-pinned dev-readiness and baseline tag evidence remain current. Historical lineage artefacts may be reclassified or indexed, but not silently deleted. Any evidence pin changed by USF-230 requires revalidation and merge SHA recording.

## Execution Plan for USF-230

1. Create a current-state authority index for developers and AI agents.
2. Reclassify source-use, parity, closure, and bootstrap artefacts as historical lineage or transitional scaffolding where appropriate.
3. Update active developer and AI workflow docs to point to current semantic contracts, validators, proof commands, dev handover, and baseline tag evidence.
4. Preserve validators, planted defects, proof commands, and evidence rows; add preservation checks if a gap is found.
5. Produce a final optimisation evidence report with PR, merge SHA, validation, retained lineage, removed or reclassified artefacts, and non-claims.

USF-230 must split work into child issues only if execution discovers separable ownership, risk, or validation boundaries. The strategy itself does not create extra child issues because USF-230 already exists as the authorised execution issue.

## Non-Claims

This strategy does not claim test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, or full product readiness. It does not reopen or change the completed foundation and dev-readiness baseline.
