# No-Regression Proof Plan

| Field | Value |
| --- | --- |
| Linear issue | USF-823 |
| Status | Design artifact for optimisation risk management |
| Scope | Repository, command, validator, evidence, cache, CI, and proof-ladder optimisation work |
| Authority posture | This document plans proof expectations only. It does not redefine USF semantic authority. |

## Purpose

This plan defines the no-regression proof required before any optimisation,
deprecation, replacement, cache introduction, affected-only shortcut, command
surface change, or proof/evidence pipeline change can be accepted under the
USF-952 orchestration programme.

The plan protects existing accepted proof, validator behavior, non-claim
posture, functional delivery, and command compatibility while allowing the
repository to become faster, more maintainable, and more cacheable. It is
intended to be used before high-risk implementation issues such as Makefile
restructuring, CI reshaping, cache policy changes, evidence promotion changes,
proof-cockpit incrementalisation, and target deprecation.

## Non-Claims

This plan does not claim staging readiness, product readiness, production
readiness, live-provider readiness, store readiness, compliance certification,
or release readiness.

This plan does not run fresh proof-cockpit machine QA for every orchestration
change. Fresh proof-cockpit machine evidence is deferred to the terminal
orchestration gate tracked by USF-966, after all controlled orchestration
changes have completed or been deliberately closed. Until then, proof-cockpit
projection-only changes must prove that they used retained machine evidence and
must run projection and acceptance validators.

This plan does not authorize removing existing proof evidence, downgrading
validators, weakening non-claims, collapsing Dev/Test/Staging, or using staging
as the default proof path.

## Required Inputs

Future optimisation issues must read the current repository state and identify
which of these inputs are affected:

- USF constitutional and foundational governance artifacts.
- Current-state foundation authority index.
- Current-state command surface.
- Accepted ADRs relevant to the changed command, proof, validator, evidence, or
  environment behavior.
- Makefile targets and package scripts.
- CI workflows and required checks.
- Validator code, selftests, planted defects, and validator reports.
- Test inventories and regression-suite documentation.
- Compose manifests, generated Compose tooling, and service profile policies.
- Proof-cockpit acceptance validators, projection tooling, and retained machine
  QA artifacts.
- Evidence invalidation and evidence reuse validators.
- Baseline timing, command graph, and assurance classification outputs.

Current command-surface references include `Makefile`, `package.json`,
`.github/workflows/validate-spec.yml`, `.github/workflows/proof-anchor.yml`,
`docs/architecture/current-state-command-surface.md`, and
`docs/architecture/current-state-command-surface.json`.

## Change Classes

Every optimisation issue must classify the change before implementation.

| Change class | Examples | Minimum no-regression expectation |
| --- | --- | --- |
| Documentation or planning only | Architecture notes, issue closure reports, inventory reports | Strict changed-file validation, relevant repository validation, no readiness claim. |
| Authority or semantic definition | Charter, authority model, semantic instances, ADRs | Constitutional or ADR process as applicable, validator traceability, no implicit implementation. |
| Command surface | Makefile targets, package scripts, help output, command aliases | Before and after command inventory, compatibility matrix, exit-code contract, target dependency review. |
| Validator or test tooling | Validator rules, selftests, planted defects, test runner configuration | Validator selftest, planted-defect coverage, before and after validator equivalence, false-positive and false-negative review. |
| Cache or affected-only execution | Input hashing, cache keys, partial validation, changed-file selectors | Full-run fallback on ambiguity, input completeness proof, stale evidence detection, cache invalidation proof. |
| Evidence and artifact pipeline | Evidence manifests, artifact retention, promotion, projection re-pin | Evidence invalidation validation, evidence reuse validation, manifest/hash comparison, chain-of-custody preservation. |
| Proof-cockpit projection | Review projections regenerated from retained machine evidence | Projection re-pin check, proof-cockpit acceptance validation, retained machine-evidence trace, no fresh machine QA until USF-966. |
| Compose or provider behavior | Compose profile, provider substitute, healthcheck, startup dependency | Compose validation, provider/environment matrix review, Test-level proof before any staging escalation. |
| CI workflow | Required checks, caches, sharding, affected-run logic, artifacts | Local parity command, required-check matrix, fail-closed fallback, before and after CI assurance comparison. |
| Deprecation or removal | Removing targets, deleting generated artifacts, retiring validators | Owner decision where material, replacement proof, compatibility window, rollback path, before and after equivalence. |

## Required Comparison Matrix

An optimisation PR or issue closure package must include a comparison appropriate
to its change class. Skipped rows must have a stated reason.

| Comparison | Required when | Evidence required |
| --- | --- | --- |
| Command inventory before and after | Makefile or package script changes | List of added, changed, removed, aliased, and deprecated commands. |
| Command contract before and after | Command-surface changes | Inputs, outputs, exit codes, generated artifacts, destructive behavior, and required environment variables. |
| Validator equivalence | Validator, aggregate validation, affected-only, or cache changes | Before and after validator results, selftests, planted defects, and known false-positive/false-negative review. |
| Test equivalence | Test runner, test selection, sharding, or regression-suite changes | Mandatory tests per change type, skipped tests with reason, and fallback to full run on ambiguity. |
| Proof-cockpit equivalence | Proof-cockpit acceptance, projections, or evidence bundle changes | Proof-cockpit acceptance validation, compare/projection checks where applicable, and retained machine-evidence trace. |
| Evidence freshness | Evidence, artifact, cache, or promotion changes | Fresh/stale/unknown handling, invalidation map, reuse eligibility, and fail-closed behavior. |
| CI parity | CI workflow, cache, sharding, or required-check changes | Local command parity, required status-check matrix, timeout/retry policy, and artifact upload/download policy. |
| Performance timing | Performance, cache, sharding, or command reordering changes | Baseline timing reference, after timing, variance notes, and assurance preserved or added. |
| Rollback path | Medium, high, and owner-decision changes | Revert path, retained artifacts, compatibility window, and known irreversible effects. |
| Non-claim review | Any change touching proof, staging, provider, compliance, or UI surfaces | Explicit statement that claims do not exceed observed proof. |

## Risk Scoring

Each optimisation issue must score risk before implementation. Use the highest
applicable score when a change spans multiple dimensions.

| Dimension | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| Authority impact | No authority files touched | Generated or explanatory docs touched | ADR or semantic-definition adjacency | Constitutional or normative semantic authority touched |
| Validator impact | No validator behavior touched | Validator output/report shape only | Validator rule or severity touched | Blocking validator weakened, removed, or replaced |
| Proof/evidence impact | No proof/evidence touched | Generated projection only | Evidence freshness, reuse, or manifest touched | Accepted proof evidence removed, downgraded, or invalidated |
| Command compatibility | No command change | Help or docs only | Alias, target, exit-code, or artifact contract changed | Existing supported command removed or made incompatible |
| CI/cache impact | No CI/cache change | Non-blocking CI reporting | Required check, cache key, or affected-run selector changed | Required full validation bypassed without fail-closed fallback |
| Environment ladder impact | No environment impact | Dev-only validation routing | Test/Compose policy changed | Staging/provider/human-acceptance policy changed |
| Destructive potential | No destructive operation | Reversible generated output cleanup | Retention, deletion, or prune policy touched | Irreversible deletion or accepted evidence loss possible |

Risk bands:

- Low: 0 to 3. Use issue-specific validation and relevant repository validators.
- Medium: 4 to 7. Require before and after comparison, rollback notes, and
  parent/orchestration issue comment.
- High: 8 to 12. Require a no-regression proof package, dependency links to
  affected equivalence issues, and a reviewer-visible risk note before merge.
- Owner decision required: any red-line trigger below, regardless of score.

Where an issue needs a compact issue-comment risk summary, record impact times
likelihood on a 1 to 3 scale. Scores 1 to 2 are low, scores 3 to 4 are medium,
score 6 is high, and score 9 is critical. A critical score blocks ordinary
execution until full proof or an explicit owner/risk decision exists.

## Red-Line Owner Decision Triggers

Do not proceed as an ordinary optimisation if any trigger applies:

- Accepted proof or evidence would be deleted, downgraded, or made unverifiable.
- A validator, non-claim, or fail-closed rule would be weakened.
- The Charter, Authority Model, or constitutional authority order would change.
- A staging, product, production, compliance, store, release, or readiness claim
  would be made.
- Provider account ownership, paid service use, legal posture, or compliance
  posture would materially change.
- A destructive command could remove retained evidence without a reversible
  compatibility window.
- Two materially different architectures remain viable and existing USF
  authority does not determine the choice.

## Proof-Ladder Discipline

Optimisation work must use the lowest sufficient proof level first:

- Documentation or metadata only: strict parse and relevant changed-file
  validation.
- Semantic or authority adjacency: semantic validators, ADR traceability, and
  no implementation until authority permits it.
- Tooling or validator change: validator selftests, planted defects, and
  before/after validator comparison.
- Runtime or behavior change: Dev in-memory proof first when applicable.
- Provider or service integration change: Test/Compose proof after Dev evidence.
- Staging-relevant change: staging proof only when the change affects
  staging-relevant runtime, deployment, provider integration, public proof, or
  human acceptance surfaces.

Staging proof is not the default proof mechanism for repository optimisation.
Semantic, documentation, tooling, and projection-only changes must have
proportionate proof.

## Proof-Cockpit Evidence Boundary

During USF-952 orchestration, proof-cockpit machine evidence is handled in two
separate modes:

- Projection-only mode: allowed for lower-authority review projections and
  bundle metadata generated from retained machine evidence. It must run the
  projection re-pin check and proof-cockpit acceptance validators, and must state
  that no fresh machine QA was run.
- Terminal refresh mode: reserved for USF-966 after all controlled
  orchestration changes have completed or been deliberately closed. This is the
  point where fresh proof-cockpit machine evidence is expected.

No intermediate optimisation issue may claim fresh proof-cockpit machine
evidence unless it actually runs and records it, and no issue should require
fresh machine evidence merely because a projection, report, or repository
planning artifact changed.

Current retained proof-cockpit roots that may be used as review context are:

- Before root: `artifacts/proof-cockpit/machine-runs/2026-07-06T15-06-30-097Z`.
- Current retained root:
  `artifacts/proof-cockpit/machine-runs/2026-07-06T15-10-33-975Z`.

Proof-cockpit comparison must fail closed for missing artifacts, strict JSON
failure, non-claim drift, warning or gap count drift, capability status drift,
service authentication posture drift, hash or path drift, unresolved warning
gaps, and generated-report overclaim. Screenshot byte drift with otherwise
stable screenshot identity requires owner review. Volatile timestamp, run,
path, and port differences may be normalized only when the validator already
classifies them as approved volatile differences.

Those retained roots are not asserted to be a passing comparator pair by this
plan. If comparison reports normalized artifact drift, the drift is a finding
for review and must not be converted into a pass by documentation wording.

## Evidence Invalidation And Reuse

Evidence invalidation and reuse are policy-bearing validators for optimisation
work. Future cache, affected-only, artifact, evidence, or promotion changes
must preserve these fail-closed states:

- `stale`
- `unknown`
- `partial`
- `mismatched`
- `generated-report-only`
- `superseded`
- `human-review-required`
- `terminal-refresh-deferred`

Provider or environment mismatch requires affected proof rather than reuse.
Generated reports cannot satisfy proof without underlying evidence. Human
acceptance cannot be inferred automatically. Terminal proof-cockpit machine
evidence remains deferred to USF-966 unless explicitly run and recorded by that
terminal issue.

## Acceptance Package For Future Optimisation Issues

Before a medium-risk, high-risk, deprecation, cache, CI, Makefile, validator, or
evidence-pipeline issue is marked Done, its Linear comment or repository report
must record:

- Issue key and change class.
- Risk score and red-line trigger review.
- Authority files inspected.
- Before comparison source.
- After comparison result.
- Validation commands actually run.
- Validation intentionally not run, with reason.
- Assurance preserved, assurance added, or assurance traded off.
- Rollback or compatibility path.
- Evidence freshness and non-claim statement where applicable.
- Dependency updates and remaining blockers.

Checklist items in Linear may be checked only when the corresponding validation
or evidence actually exists.

## Rollback Criteria

Rollback or block the optimisation if any of these occur:

- A validator that previously passed now fails without an approved authority
  change.
- A planted defect no longer fails closed.
- A cache or affected-only path cannot explain all semantic, proof, evidence,
  and configuration inputs used for its key.
- An ambiguous change path does not fall back to full validation.
- A command disappears, changes exit-code semantics, or changes artifact
  location without compatibility policy and dependent issue updates.
- Evidence freshness becomes stale or unknown while being treated as pass.
- Projection-only proof-cockpit work cannot trace to retained machine evidence.
- A readiness or staging claim exceeds observed proof.

Rollback review must also confirm that the proof-review gate can restore its
closed default posture after any temporary review opening, and that acceptance
ledger state is explicit rather than assumed.

## Parallelisation Rules

No-regression planning, inventories, timing measurements, dependency graphs,
read-only audits, and issue classification may run in parallel when they do not
edit the same repository files or mutate the same Linear issue state.

Implementation issues must serialize when they edit the same Makefile, package
scripts, validator core, CI workflow, authority document, evidence manifest,
artifact path, or proof freshness policy. Cache, evidence, and affected-only
changes must also serialize when one issue changes the classification or
freshness model used by another.

## Minimum Validation By Issue Type

The exact command set remains issue-specific, but these are the default
expectations:

- Documentation/design-only change: changed-file validation, strict JSON parse
  if JSON was touched, validate-spec, and repository aggregate validation when
  the change touches architecture, proof, evidence, or authority routing.
- Makefile or package script change: command inventory comparison, target help
  output, validate-spec, repo aggregate validation, and issue-specific command
  smoke where safe.
- Validator change: validator all mode, validator selftest, planted-defect or
  negative-control evidence, validate-spec, and repo aggregate validation.
- Evidence/cache/artifact change: evidence invalidation validation, evidence
  reuse validation, proof-cockpit acceptance validation where applicable, and
  repo aggregate validation.
- CI change: local parity command, required-check matrix review, validate-spec,
  repo aggregate validation, and CI status after PR.
- Staging-relevant change: only after Dev/Test evidence is sufficient, run the
  staging-specific proof required by the environment decision matrix.

Useful existing command families for future no-regression packages include
validate-spec, validate-spec selftest, repo aggregate validation, evidence
invalidation validation and selftest, evidence reuse validation and selftest,
proof-cockpit compare, proof-cockpit acceptance validation, proof-cockpit
selftest, test-readiness validation, and test-readiness selftest. Fresh
proof-cockpit machine QA is intentionally excluded from this default list until
USF-966.

## Relationship To Controlled Issues

This plan supplies the no-regression proof spine for:

- USF-365 Optimisation risk management.
- USF-823 No-regression proof plan.
- USF-827 Before and after validator equivalence.
- USF-828 Before and after proof-cockpit equivalence.
- USF-829 Rollback strategy.
- USF-966 Terminal fresh proof-cockpit machine evidence refresh.
- USF-970 Proof-cockpit projection-only re-pin and external-review bundle check.
- USF-976 Evidence invalidation validator.
- USF-983 Evidence reuse validator.

Issue-specific implementation plans may be stricter than this document. They
must not be weaker unless a recorded owner decision and USF authority update
allow it.
