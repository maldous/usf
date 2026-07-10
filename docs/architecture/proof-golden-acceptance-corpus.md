# Proof Golden Acceptance Corpus

| Field | Value |
| --- | --- |
| Linear issue | USF-825 |
| Status | Design artifact for optimisation risk management |
| Scope | Candidate corpus design for proof, report, validator, and artifact-output comparison |
| Authority posture | This document plans corpus selection and validation use only. It does not redefine USF semantic authority. |

## Purpose

USF optimisation work needs a stable way to compare proof, report, validator,
and artifact outputs before and after changes. This design identifies the
candidate golden acceptance corpus entries that future implementation issues
can turn into a machine-checkable corpus without copying bulk proof artifacts in
this issue.

The corpus is intended to support no-regression review for Makefile changes,
validator refactoring, proof-cockpit projection work, artifact retention
changes, evidence reuse, cache or affected-only execution, and CI reshaping.

## Non-Claims

This design does not by itself create a corpus, copy artifacts, delete artifacts,
prune screenshots, regenerate proof-cockpit machine QA, or assert fresh runtime
proof. A PR carrying this design can still require a proof-cockpit freshness
re-pin when validator rules require current source-tree evidence.

This design does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

This design does not treat generated reports as authority. Corpus entries are
comparison inputs only. They do not replace raw evidence, semantic authority,
accepted ADRs, validator rules, or future proof runs.

Fresh proof-cockpit machine evidence remains deferred to USF-966 unless an issue
explicitly requires earlier proof or source-tree freshness re-pin and records
that proof.

## Relationship To Existing Risk Controls

This design depends on:

- USF-598 artifact inventory and retention policy.
- USF-823 no-regression proof plan.
- USF-829 rollback strategy.
- USF-966 terminal fresh proof-cockpit machine evidence refresh.
- USF-970 projection-only proof-cockpit re-pin checks.
- USF-976 evidence invalidation design.
- USF-983 evidence reuse validator.
- USF-984 evidence invalidation validator.

The golden corpus should be used by later equivalence and optimisation issues,
including validator equivalence, proof-cockpit equivalence, artifact pruning,
artifact diffability, and affected-only validation.

## Corpus Design Principles

- Prefer references to retained artifacts over copied payloads.
- Include stable IDs, counts, hashes, and manifest paths rather than bulk bytes.
- Preserve the latest retained machine run and one prior retained run as the
  primary proof-cockpit comparison pair while retention policy allows.
- Preserve authority labels: raw evidence and retained artifacts outrank
  generated reports.
- Include both positive and negative-control examples where validators already
  provide them.
- Include representative coverage across route evidence, capability evidence,
  service evidence, screenshots, chain of custody, external-review bundles,
  generated reports, and fail-closed validators.
- Treat stale, unknown, partial, mismatched, superseded,
  generated-report-only, human-review-required, and terminal-refresh-deferred
  evidence as non-current for readiness.
- Fall back to broader proof or full validation when an input cannot be
  classified.
- Do not use staging proof as the default proof path for repository
  optimisation.

## Candidate Corpus Entries

Future implementation should create a manifest that references these entries
and records expected hashes, counts, schema or shape expectations, and
comparison policy. USF-825 does not create that manifest.

| Candidate ID | Source reference | Selection rationale | Retention expectation | Validation use |
| --- | --- | --- | --- | --- |
| proof-cockpit-current-run | latestMachineRun.reportJson in evidence/proof-evidence/proof-cockpit/staging-evidence-store.json | Current retained machine QA run metadata and run-level counts | Keep while referenced by staging evidence store latestMachineRun | Compare run metadata, non-claims, counts, source SHA, source tree hash, deployment SHA, environment, and supported rerun modes |
| proof-cockpit-prior-run | Prior retained run from machineRunHistory in evidence/proof-evidence/proof-cockpit/staging-evidence-store.json | Prior retained machine QA run for before and after review context | Keep while retention policy keeps one prior full run | Compare normalized proof-cockpit outputs without treating drift as a pass by default |
| route-manifest-current | route-manifest.json under the latest retained machine-run artifact directory | Covers 830 route records with route, auth requirement, role, evidence status, and screenshot or artifact link | Retain with current machine run | Detect route count, route identity, evidence status, auth, and artifact-link drift |
| route-manifest-prior | route-manifest.json under the prior retained machine-run artifact directory | Provides the paired before-run route manifest | Retain with prior machine run | Support route-level before and after comparison |
| capability-manifest-current | semantic-capability-manifest.json under the latest retained machine-run artifact directory | Covers 75 semantic capabilities and machine or human-review state | Retain with current machine run | Detect capability identity, result, evidence status, and human-review-status drift |
| service-evidence-current | service-evidence-manifest.json under the latest retained machine-run artifact directory | Covers 40 services, service kinds, capability mappings, scenario mappings, service auth posture, and service evidence artifacts | Retain with current machine run | Detect service coverage, service auth, scenario, artifact hash, and target-observation drift |
| screenshot-manifest-current | proof-cockpit-screenshot-manifest.json under the latest retained machine-run artifact directory | Covers 94 screenshot or screenshot-equivalent records without requiring image byte comparison as the first check | Retain manifest with current machine run; screenshot bytes require stricter review before pruning | Detect screenshot identity, hash, route, service, auth posture, and screenshot-equivalent drift |
| evidence-index-current | evidence-index.json under the latest retained machine-run artifact directory | Covers normalized evidence records and claim-supported mapping | Retain with current machine run | Detect evidence record shape, freshness, limitations, content hash, metadata hash, human-review status, and retained status drift |
| chain-of-custody-current | chain-of-custody.json under the latest retained machine-run artifact directory | Covers claim-to-evidence traceability for audit review | Retain with current machine run | Detect claim, semantic source, actor, artifact hash, environment, source SHA, validation result, and human-import status drift |
| external-review-bundle-current | evidence/proof-evidence/proof-cockpit/external-review-bundle/manifest.json | Current promoted external-review bundle projection from retained machine evidence | Retain as generated projection with lower authority than retained source artifacts | Check projection metadata, required inputs, output paths, non-claims, and retained source linkage |
| final-external-review-report-current | evidence/proof-evidence/proof-cockpit/final-external-review-report.md | Human-readable projection used by reviewers | Retain as generated report, never as authority by itself | Compare report metadata and non-claim language while requiring underlying evidence references |
| staging-evidence-store-current | evidence/proof-evidence/proof-cockpit/staging-evidence-store.json | Durable evidence store with latest run, run history, storage model, supersession history, and non-claims | Retain as proof-cockpit evidence store | Check latestMachineRun linkage, machineRunHistory, payloadPruned markers, storage model, and non-claim preservation |
| proof-cockpit-validator-planted-defects | tools/validate-proof-cockpit-acceptance/planted-defects | Existing fail-closed negative-control corpus for proof-cockpit acceptance | Retain as validator fixtures | Verify proof-cockpit validator selftest coverage and prevent weakened fail-closed behavior |
| evidence-invalidation-planted-defects | tools/validate-evidence-invalidation/planted-defects | Existing negative controls for stale, generated-report-only, hash, provider, environment, hidden-finding, and human-decision failure states | Retain as validator fixtures | Verify invalidation map fail-closed behavior |
| evidence-reuse-planted-defects | tools/validate-evidence-reuse/planted-defects | Existing negative controls for unsafe evidence reuse | Retain as validator fixtures | Verify reuse decisions block stale, mismatched, ambiguous, or overclaimed evidence |
| validate-spec-positive-and-negative-fixtures | tools/validate-spec/fixtures | Baseline positive and negative corpus for semantic shape and validator-report behavior | Retain as validator fixtures | Verify schema, semantic, report, provider, environment, proof-evidence, and evidence-envelope validation does not drift |
| proof-artifact-retention-policy | docs/architecture/proof-artifact-retention-policy.md | Governs latest-plus-prior full payload retention and pruned metadata expectations | Retain as policy reference | Ensure corpus retention does not conflict with artifact-retention policy |
| no-regression-proof-plan | docs/architecture/no-regression-proof-plan.md | Defines comparison matrix and proof-cockpit evidence boundary | Retain as risk-control reference | Ensure future corpus validation supports no-regression packages |
| rollback-proof-strategy | docs/architecture/rollback-proof-strategy.md | Defines rollback triggers and owner-decision boundaries | Retain as risk-control reference | Ensure corpus drift can trigger rollback, block, or owner-decision path |

## Selection Rationale

The initial candidate set deliberately spans these dimensions:

- Run-level metadata: source SHA, deployment SHA, environment, selected rerun
  mode, repository state, start and completion times, and tool versions.
- Route surface: route identity, auth requirement, role used, evidence status,
  screenshot or artifact link, and gap status.
- Semantic capability surface: capability ID, route, result, evidence status,
  and human-review status.
- Service surface: service ID, service kind, service protocol, capability and
  scenario mappings, service evidence, service authentication posture, and
  target observations.
- Screenshot surface: screenshot identity, screenshot-equivalent handling,
  route, service, artifact path, and hash behavior.
- Evidence surface: stable evidence IDs, evidence type, target object, claim
  supported, proof method, limitations, content hash, metadata hash, artifact
  hash, freshness policy, retained status, and human acceptance status.
- Chain of custody: claim, semantic source, scenario, actor, service, route or
  adapter, artifact hash, timestamp, environment, source SHA, deployment SHA,
  validation result, and human-import status.
- Generated projections: external-review bundle manifest and final report,
  explicitly treated as lower-authority outputs derived from retained evidence.
- Validator controls: positive fixtures, negative fixtures, and planted defects
  that prove validators fail closed.

This breadth is intended to catch regressions that a single generated report or
single screenshot sample would miss.

## Retention Expectations

USF-825 does not change retention. Future implementation should follow these
expectations:

- Keep the corpus manifest lightweight and reviewable.
- Reference retained artifact paths and hashes instead of copying bulk artifact
  trees.
- Record whether a referenced machine-run payload is retained or explicitly
  pruned.
- Do not require older pruned payloads to reappear merely because they remain
  in machineRunHistory.
- Do not delete or prune screenshots as part of corpus creation.
- If a screenshot byte comparison is used, separate identity or hash drift from
  owner-review-required visual drift.
- Keep generated reports tied to their underlying retained evidence.
- Preserve proof-cockpit source SHA and deployment SHA boundaries.
- Treat a corpus entry as historical if its source commit no longer matches the
  state being claimed.
- Keep USF-966 as the terminal fresh machine-evidence refresh point.

## Validation Use

Future implementation should support these validation uses:

| Use | Expected behavior |
| --- | --- |
| Validator equivalence | Run the relevant validator in all mode and selftest mode, compare rule IDs, findings, JSON output shape, and planted-defect behavior |
| Proof-cockpit equivalence | Compare retained machine-run artifacts with approved normalization, fail closed on non-claim, count, auth, warning, gap, hash, source, and metadata drift |
| Projection-only proof-cockpit checks | Rebuild or check reviewer projections from retained machine evidence and confirm no fresh machine QA was claimed |
| Artifact retention review | Confirm the corpus manifest references retained payloads or explicit pruned metadata, not dangling paths |
| Evidence reuse review | Confirm stale, unknown, partial, mismatched, superseded, generated-report-only, human-review-required, and terminal-refresh-deferred states do not satisfy current pass |
| Affected-only validation review | Use corpus entry input classes to decide whether a partial run is safe, and fall back to full validation on ambiguity |
| CI parity review | Use the same corpus manifest locally and in CI where possible, with required-check names recorded separately |

## Future Manifest Requirements

A future machine-readable corpus manifest should include:

- Stable corpus ID and version.
- Owning issue and parent programme reference.
- Non-authority statement.
- Candidate entry ID.
- Entry class, such as retained artifact, evidence store, generated projection,
  validator fixture, planted defect, policy reference, or generated report.
- Source path.
- Expected content hash or hash policy.
- Expected record counts where applicable.
- Expected source SHA and deployment SHA where applicable.
- Provider mode and environment where applicable.
- Authority level and generated-report boundary.
- Retention class and prune policy.
- Freshness policy.
- Comparison policy.
- Validation commands.
- Owner-review trigger.
- Related issues and blocked follow-up issues.

The future manifest should fail validation if an entry is missing, hash policy
is absent, generated reports are treated as authority, freshness is ambiguous,
or owner-review-required drift is converted to pass.

## Regeneration And Drift Rules

- Regeneration must be issue-scoped and recorded.
- A corpus manifest may be updated when retained evidence is intentionally
  refreshed, when USF-966 runs terminal machine QA, when a validator fixture is
  intentionally changed, or when an accepted retention policy changes.
- Drift caused by timestamps, temporary artifact roots, ports, or other
  validator-approved volatile fields may be normalized only by an approved
  comparator.
- Drift in source SHA, deployment SHA, environment, route identity, capability
  identity, service auth posture, warning count, failure count, gap count,
  non-claim language, artifact hash, screenshot identity, or chain-of-custody
  mapping is not automatically acceptable.
- Screenshot byte drift requires owner review unless a future validator proves
  the difference is an approved volatile artifact.
- If a future corpus update would delete accepted proof or evidence, downgrade
  a validator, weaken a non-claim, or make a readiness claim, ordinary execution
  must stop for owner decision.

## Validation Expectations For This Design

This design artifact should be validated on current main with:

- Strict JSON parse of foundational catalogues.
- Changed-file whitespace check.
- Repository aggregate validation.
- Validate-spec.
- Validate-spec selftest.
- Proof-cockpit acceptance validation.
- Proof-cockpit acceptance selftest.
- Linear boundary validation.

- Evidence reuse validation and selftest.
- Evidence invalidation validation and selftest.
- Repository aggregate validation on ambiguity or before merge.

This design does not by itself require fresh proof-cockpit machine QA, but a
repository source change that moves the proof-cockpit source tree hash must
re-pin proof-cockpit evidence before merge.

## Acceptance Mapping

USF-825 acceptance requires the design to identify candidate corpus entries,
selection rationale, retention, and validation use.

| Acceptance concern | Where addressed |
| --- | --- |
| Candidate corpus entries | Candidate Corpus Entries |
| Selection rationale | Selection Rationale |
| Retention | Retention Expectations |
| Validation use | Validation Use and Future Manifest Requirements |

## Deferred Work

Future issues may implement:

- A machine-readable golden corpus manifest.
- A corpus validator with planted defects.
- A proof-cockpit corpus comparator profile.
- CI/local parity for corpus checks.
- Corpus refresh after USF-966 terminal machine QA.
- Owner-review workflow for screenshot-byte drift.

Those issues must preserve USF authority, accepted proof, non-claims,
fail-closed validator behavior, and Dev/Test/Staging proof ladder discipline.
