# Proof Cockpit Machine QA Artifact Minimisation Design

| Field | Value |
| --- | --- |
| Linear issue | USF-618 |
| Status | Design artifact for evidence and artifact optimisation |
| Scope | Machine-QA artifact classification and future minimisation policy |
| Authority posture | This document plans future optimisation only. It does not redefine USF semantic authority. |

## Purpose

USF retains proof-cockpit machine-QA artifacts so route, capability, service,
screenshot, evidence, and chain-of-custody findings can be reviewed and
replayed. The retained runs are intentionally rich, but repeated optimisation
and UI-readiness work needs a smaller and more explicit artifact contract so
future changes can reduce repository weight without weakening proof discipline.

This design identifies which machine-QA artifact classes are required, optional,
or future-prunable. It does not prune any artifact, delete accepted evidence,
change proof-cockpit logic, update validator rules, or refresh machine-QA
evidence.

## Non-Claims

This design does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

This design does not make generated reports authoritative. Generated reports
remain lower authority than semantic definitions, accepted ADRs, validator
rules, runtime proof evidence, and retained source artifacts.

Fresh proof-cockpit machine evidence remains deferred to USF-966 unless an issue
explicitly requires earlier proof or source-tree freshness re-pin and records
that proof.

## Current Artifact Baseline

The current retained proof-cockpit machine-run artifact root is
artifacts/proof-cockpit/machine-runs. It is approximately 106 MB and contains
two full machine-QA run payloads: the latest retained machine run and one prior
full run. The exact retained run IDs are recorded in
evidence/proof-evidence/proof-cockpit/staging-evidence-store.json, not repeated
here as authority.

- latest retained full run at approximately 53 MB;
- prior retained full run at approximately 53 MB.

The promoted evidence projection root evidence/proof-evidence/proof-cockpit is
approximately 1.9 MB.

The current retained run identified by the staging evidence store includes:

- 223 files, including 118 JSON files, 94 PNG files, 10 Markdown files, and
  one HTML file.
- 830 route records.
- 75 semantic capability records.
- 40 service records.
- 94 screenshot or screenshot-equivalent records.
- 40 service-evidence files.
- 66 external-review-bundle files.
- 1190 evidence records.
- 1190 chain-of-custody records.
- 1283 check records.
- 11 run-level non-claim values and one nonClaimRecord evidence record.

The latest retained run's visual artifacts currently dominate repository
weight. PNG files account for approximately 34 MB, while JSON files account for
approximately 19 MB. That makes screenshot policy and duplicate bundle handling
the highest-leverage minimisation surfaces, but also the highest-risk review
surfaces.

The current retention policy already keeps the latest run in full, keeps one
prior run in full, and requires older superseded history entries to either
retain a payload or carry an explicit payloadPruned marker.

## Required Artifact Classes

These artifact classes must remain available for any retained run or preserved
through equivalent manifest and hash-backed custody before a future
minimisation can be accepted.

| Class | Current examples | Assurance preserved |
| --- | --- | --- |
| Run metadata | proof-cockpit-machine-qa-run.json, qa-run.json | Preserves run identity, source SHA, deployment SHA, rerun modes, counts, non-claims, warning state, and terminal-refresh boundaries. |
| Route manifest | route-manifest.json, route-port-adapter-manifest.json | Preserves route identity, auth posture, route evidence status, role mapping, port or adapter mapping, and route-count drift detection. |
| Capability manifest | semantic-capability-manifest.json | Preserves capability identity, route mapping, result state, evidence state, and human-review status. |
| Service manifest | service-manifest.json, service-evidence-manifest.json, adapter-manifest.json | Preserves service identity, service kind, adapter coverage, service auth posture, capability mapping, and service evidence linkage. |
| Screenshot manifest | proof-cockpit-screenshot-manifest.json, composed-service-screenshot-manifest.json | Preserves screenshot identity, screenshot-equivalent status, route or service association, artifact path, and content hash. |
| Evidence index | evidence-index.json | Preserves normalized evidence IDs, target object, proof method, limitations, content hash, metadata hash, freshness policy, retention state, and human acceptance state. |
| Chain of custody | chain-of-custody.json | Preserves claim-to-evidence traceability, semantic source, actor, service, route or adapter, artifact hash, environment, source SHA, deployment SHA, and validation result. |
| Gap and corrective-action records | gap-register.json, corrective-actions.json, machine-qa-actions.json | Preserves explicit warning, gap, corrective-action, and follow-up state so issues cannot disappear through minimisation. |
| Human import records | human-import-manifest.json | Preserves the distinction between machine collection and human acceptance. |
| Command and source manifests | command-manifest.json, source-document-manifest.json | Preserves command provenance, source references, and replay context where available. |
| Promoted evidence store | evidence/proof-evidence/proof-cockpit/staging-evidence-store.json | Preserves latest-machine-run linkage, machine-run history, supersession history, retention model, and pruned-payload metadata. |
| External review bundle manifest | evidence/proof-evidence/proof-cockpit/external-review-bundle/manifest.json | Preserves generated projection inputs and lower-authority report boundaries for reviewer bundles. |
| Validator fixtures and planted defects | tools/validate-proof-cockpit-acceptance/planted-defects, tools/validate-evidence-invalidation/planted-defects, tools/validate-evidence-reuse/planted-defects | Preserves fail-closed regression coverage for proof-cockpit acceptance, evidence invalidation, and evidence reuse. |

Required does not always mean the original bulk bytes must be retained forever.
It means a future optimisation must retain enough source evidence, metadata,
hashes, and replay context for the assurance in the table to remain auditable.

## Optional Artifact Classes

These artifact classes may be retained when useful for review, but they can be
optimized first if future implementation proves the required evidence above is
unchanged and review value is preserved.

| Class | Current examples | Minimisation option | Assurance boundary |
| --- | --- | --- | --- |
| Generated HTML report | proof-cockpit-machine-qa-report.html | Rebuild from retained JSON and manifests, or retain compressed copy. | The report is reviewer convenience only and cannot satisfy proof without underlying evidence. |
| Generated Markdown report | proof-cockpit-machine-qa-report.md, external-review-report.md | Rebuild or compare projection metadata and non-claim text. | Generated report drift must not hide warning, gap, non-claim, count, or source drift. |
| External review bundle copies | external-review-bundle files copied from retained run data | Replace duplicate copies with manifest references or compressed transport archives where review tooling supports it. | Bundle minimisation must preserve manifest hashes, source-run linkage, and generated-report boundary. |
| Exact duplicate manifests | service-manifest.json and service-evidence-manifest.json currently have identical content in the latest retained run. | Keep one canonical source plus an explicit compatibility output when future tooling proves both names are still needed. | Name-level compatibility must not hide service coverage, auth posture, or hash drift. |
| Empty bundle directories | commands, console, network, page-html, screenshots, and source-documents directories inside the current external review bundle | Omit empty directories from future generated bundles if the manifest records that the class has no retained payload. | Review tooling must not interpret an omitted empty directory as missing evidence. |
| Derived previews and thumbnails | future screenshot previews or reduced images if introduced | Keep only if they improve review ergonomics. | Derived assets must not replace source screenshot or screenshot-equivalent evidence without explicit approval. |
| Pass-route auxiliary traces | future per-route console, network, DOM, or page snapshots for routes with no warning or gap | Retain on failure or sample by policy if future tooling introduces these classes. | Full proof must be rerunnable, and ambiguity must fall back to broader proof. |
| Compressed transport archives | future zip or tar outputs for CI upload or external review transport | Use as a transport layer, not as the only evidence record unless content hashes and extraction validation are recorded. | Compression must preserve hashes, paths, and manifest identity. |

## Future-Prunable Candidate Classes

These classes are candidates for future pruning only after a dedicated
implementation issue proves no-regression behavior and records the owner-safe
decision boundary.

| Class | Future pruning condition | Assurance preserved | Risk or regression |
| --- | --- | --- | --- |
| Older superseded run payloads | The evidence store retains identity, source SHA, counts, supersession reason, and explicit payloadPruned true metadata. | Preserves chain of custody while removing reproducible bulk payloads. | A reviewer may need to regenerate an older payload before inspecting fine-grained artifacts. |
| Duplicate generated report copies | Underlying JSON, manifests, hashes, and source-run linkage are retained. | Preserves proof evidence while reducing lower-authority duplicates. | Report-specific formatting drift may be harder to compare unless projection checks cover it. |
| Duplicate external-review bundle payloads | Bundle manifest can reference retained source artifacts or a content-addressed archive. | Preserves reviewer bundle identity and generated-output boundary. | Review tools that expect copied files may need an adapter. |
| Duplicate service manifest bytes | A canonical source remains hash-addressed and any compatibility projection is regenerated deterministically. | Preserves service evidence and service manifest semantics while avoiding duplicate stored bytes. | Consumers may rely on both filenames until compatibility is explicitly proven. |
| Empty generated directories | Bundle manifest records the class as intentionally empty, and reviewer tooling accepts absence as equivalent to an empty directory. | Preserves generated bundle shape without retaining empty filesystem scaffolding. | Directory-sensitive tooling could report false missing-artifact failures. |
| Transient temporary roots | The paths are not referenced by evidence-index, chain-of-custody, screenshot manifest, service-evidence manifest, or promoted evidence store. | Prevents non-evidence working files from growing retained payloads. | Misclassification could delete useful debug context if references are incomplete. |
| Pass-only auxiliary traces | Route, screenshot, evidence, and chain-of-custody manifests remain complete, and failures keep full auxiliary traces. | Keeps pass-state proof while focusing bulk context on failures. | A passing route regression may need a fresh run to recover omitted auxiliary context. |
| Redundant screenshot bytes | A future screenshot retention policy permits pruning, screenshot manifest hashes remain, representative corpus constraints are met, and owner-review triggers are preserved. | Preserves screenshot identity while allowing targeted reduction. | Visual evidence can be review-critical, so pruning can remove human-review context. |

## Never-Prune Without Owner Decision

Future optimisation must stop for an explicit owner decision before deleting or
downgrading any of these classes:

- Latest retained machine-QA run full payload while the retention policy names it
  as the current full run.
- One prior retained machine-QA run full payload while the retention policy
  requires a prior full run.
- Accepted proof records, accepted evidence records, or proof-cockpit evidence
  store history.
- Chain-of-custody records and evidence-index records used by accepted proof.
- Human import, human review, corrective-action, gap, warning, or residual-risk
  records.
- Non-claim records or validator findings that prevent overclaiming.
- Validator fixtures, planted defects, or fail-closed negative controls.
- Golden corpus entries once a future corpus manifest is implemented.
- Screenshots or screenshot-equivalent artifacts that a reviewer or future
  policy marks as review-critical.

## Minimisation Decision Rules

Future implementation should apply these rules before any artifact-reduction
change:

1. Classify the changed paths with the evidence invalidation validator.
2. Confirm whether the change affects raw evidence, generated projections,
   manifests, validator fixtures, proof models, or reviewer convenience files.
3. Preserve all required artifact classes or replace them only with an
   explicitly validated manifest, hash, and regeneration contract.
4. Treat ambiguity as a reason to fall back to broader proof.
5. Keep generated reports lower authority than retained evidence.
6. Preserve non-claim language and human-acceptance boundaries.
7. Preserve the latest full run and one prior full run until the retention
   policy is deliberately changed.
8. Use compression only when hash and extraction validation prove byte-level
   identity or approved normalization.
9. Avoid screenshot pruning until a screenshot-specific policy and no-regression
   validation exist.
10. Record any high-risk pruning as owner-decision work before execution.

## Assurance Preserved And Tradeoffs

| Proposed improvement | Assurance preserved or added | Tradeoff |
| --- | --- | --- |
| Manifest-first review | Adds clearer required inputs, hashes, counts, and linkage before reading bulk artifacts. | Reviewers may need tooling to follow references instead of opening copied payloads. |
| Failure-focused retention | Preserves full context for warnings, gaps, failures, corrective actions, and human-review-required states. | Pass-state debug context may require rerun if not retained. |
| Generated report de-duplication | Preserves lower-authority report status and requires underlying retained evidence. | Report formatting comparisons need projection checks. |
| Content-addressed or compressed transport | Preserves path and hash contracts while reducing repeated bytes in CI or review bundles. | Extraction and hash validation become required. |
| Superseded payload pruning | Preserves historical identity and supersession metadata. | Fine-grained historical inspection may require deterministic regeneration. |

No proposed optimisation may trade away fail-closed behavior, non-claim
language, human acceptance boundaries, validator planted defects, or evidence
freshness discipline for speed.

## Dependencies And Follow-Up Issues

- USF-598 supplies the artifact inventory and retention policy baseline.
- USF-619 should define screenshot artifact retention and pruning before any
  screenshot byte pruning is implemented.
- USF-633 should define artifact diffability and review ergonomics before
  changing reviewer-facing bundle formats.
- USF-769 should profile machine-QA route coverage before any coverage-reducing
  proposal is considered.
- USF-823, USF-825, and USF-829 provide no-regression, corpus, and rollback
  controls for higher-risk artifact changes.
- USF-966 remains the terminal fresh proof-cockpit machine evidence refresh
  after orchestration work is complete.

## Validation Expectations For Future Implementation

Future implementation issues that reduce or transform machine-QA artifacts
should provide:

- A before and after artifact inventory with size, file count, and retained
  artifact classes.
- Evidence invalidation classification for every changed proof or artifact path.
- Proof that required classes remain present, hash-addressable, or
  regenerable.
- Proof that generated reports still reference retained evidence and do not
  become authority.
- Validator selftests for any changed proof-cockpit, evidence-invalidation, or
  evidence-reuse rule.
- Projection-only checks when only generated reports or reviewer bundles change.
- A full-run fallback on ambiguity.
- A rollback path if required evidence, non-claims, warning visibility, gap
  visibility, or human-review boundaries regress.

Fresh proof-cockpit machine QA should be reserved for issues that change runtime
proof collection behavior or for the terminal USF-966 refresh unless an earlier
issue records a stricter proof requirement.

## Acceptance Mapping For USF-618

USF-618 requires a minimisation proposal that identifies required, optional, and
prunable artifact classes. This design satisfies that by:

- Defining required artifact classes in the required artifact table.
- Defining optional artifact classes in the optional artifact table.
- Defining future-prunable candidate classes in the future-prunable candidate
  table.
- Recording never-prune boundaries for accepted proof, evidence, non-claims,
  screenshots, validator fixtures, and chain-of-custody records.
- Recording validation and no-regression expectations for future
  implementation.

No repository artifact was pruned by this issue.
