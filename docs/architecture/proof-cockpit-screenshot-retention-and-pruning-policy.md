# Proof Cockpit Screenshot Retention And Pruning Policy

| Field | Value |
| --- | --- |
| Linear issue | USF-619 |
| Status | Design artifact for screenshot artifact retention and pruning |
| Scope | Screenshot and screenshot-equivalent retention classes for proof-cockpit machine QA |
| Authority posture | This document plans future screenshot retention work only. It does not redefine USF semantic authority. |

## Purpose

Proof-cockpit machine QA produces screenshot and screenshot-equivalent artifacts
that support route review, service evidence review, chain of custody,
external-review bundles, and future UI planning. Screenshots are one of the
largest retained artifact classes, so future optimisation needs explicit rules
for what to keep, what may be pruned, what may be regenerated, and what must
never be deleted without owner decision.

This policy is design-only. It does not delete screenshots, prune artifacts,
change proof-cockpit logic, update validators, or refresh proof-cockpit machine
QA evidence.

## Non-Claims

This policy does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

This policy does not make screenshots, generated reports, or review bundles
authoritative by themselves. Screenshots are evidence artifacts that must remain
linked to semantic authority, validator rules, retained run metadata, evidence
indexes, chain-of-custody records, and human-review state.

Fresh proof-cockpit machine evidence remains deferred to USF-966 unless a
future issue explicitly requires earlier proof and records that proof.

## Current Screenshot Baseline

The current retained proof-cockpit machine-QA roots are:

- artifacts/proof-cockpit/machine-runs/2026-07-06T15-10-33-975Z.
- artifacts/proof-cockpit/machine-runs/2026-07-06T15-06-30-097Z.

Each retained run contains a screenshots directory of approximately 33 MB. The
latest retained run includes 94 screenshot records:

- 54 proof-cockpit UI screenshot records.
- 40 service screenshot or screenshot-equivalent records.
- 40 composed-service screenshot manifest records.
- 94 existing screenshot file paths after resolving retained run paths.
- 0 observed screenshot hash mismatches in the latest retained run.

The latest retained run's screenshot records are retained context, not fresh
current evidence for HEAD. The run is pinned to source SHA
8a959501dbc1ecc0390c1e50388b94e8fbe20e8e.

The latest run's screenshot bytes are split approximately as follows:

| Class | Count | Approximate size | Notes |
| --- | ---: | ---: | --- |
| Proof-cockpit UI screenshots | 54 | 21.91 MiB | Screenshots for proof routes, import, review, evidence, enterprise, signoff, and related cockpit screens. |
| Compose service screenshots and equivalents | 40 | 10.75 MiB | Includes direct service screenshots and hash-addressed equivalent evidence pages. |
| Total latest screenshot directory | 94 | 32.66 MiB | Visual artifacts dominate the retained machine-QA payload. |

Across the two retained full runs, screenshot PNG files account for
approximately 65.32 MiB. Latest-run screenshot filenames currently group into
40 compose-service records, 28 enterprise records, 13 core proof-cockpit pages,
9 machine-run pages, and 4 first-detail pages.

The latest proof-cockpit screenshot manifest records:

- 24 compose-service screenshot-equivalent records.
- 16 direct compose-service records.
- 54 proof-cockpit UI screenshot records.
- 21 api/cli-only service posture records.
- 6 service-login-required authenticated UI captures.
- 10 intentionally anonymous/no-auth direct captures.
- 3 unsafe-to-capture service records.
- 54 proof-cockpit UI records with human-review-required state.

The evidence index contains 94 screenshotEvidence records. It also has 134
records with non-empty screenshotPath values: 94 screenshotEvidence records and
40 serviceEvidence records. The chain-of-custody file has 94 concrete
playwright-screenshot records carrying byte hashes. A future screenshot pruning
implementation must treat screenshots as linked proof artifacts rather than
isolated image files.

## Keep Classes

These screenshot artifact classes must be retained for the latest full run and
the one prior full run while the current retention policy remains in force.

| Class | Current examples | Assurance preserved |
| --- | --- | --- |
| Screenshot manifests | proof-cockpit-screenshot-manifest.json, composed-service-screenshot-manifest.json | Preserves screenshot identity, route or service mapping, auth posture, screenshot-equivalent status, path, hash, redaction posture, source SHA, run ID, and review state. |
| Proof-cockpit route screenshots | screenshots for /proof, /proof/capabilities, /proof/review, /proof/evidence, /proof/enterprise, /proof/signoff, and related routes | Preserves reviewer-visible proof cockpit route state and route-level review context. |
| Service-authenticated UI screenshots | service-login-required records such as Keycloak, MinIO, Grafana, pgAdmin, SonarQube, and Windmill where authenticated capture was required and captured | Preserves proof that the service UI evidence path existed under the recorded auth posture without exposing credentials. |
| Service anonymous/no-auth screenshots | intentionally anonymous/no-auth service screenshots such as Prometheus, Loki, Mailpit, Meilisearch, ClickHouse, WireMock, Alertmanager, Temporal UI, and Caddy | Preserves proof that direct service surfaces matched their declared anonymous/no-auth posture. |
| Screenshot-equivalent evidence pages | api/cli-only or unsafe-to-capture records such as Postgres, Redis, OpenBao, webhook sink, and other services represented by equivalent evidence pages | Preserves evidence for services where direct UI capture is unavailable or unsafe and provides human reenactment instructions. |
| Screenshot hashes | screenshotHash, authenticatedUiScreenshotHash, and artifactHash fields | Preserves byte-level drift detection and proof-cockpit comparator behavior. |
| Evidence and custody rows | evidence-index.json screenshotEvidence rows and chain-of-custody rows referencing screenshot paths and hashes | Preserves claim-to-artifact traceability and prevents generated reports from replacing raw evidence. |
| Human review and non-claim context | humanReviewStatus, finalAcceptanceBlocked, nextSafeAction, humanReenactmentInstruction, redactionStatus, syntheticDataConfirmation, and non-claim fields | Preserves the boundary between machine collection, human review, and unsupported readiness claims. |

## Prunable Classes

These classes are candidates for future pruning only after a dedicated
implementation issue proves the required manifests, hashes, chain-of-custody
records, and review context remain valid.

| Class | Future pruning condition | Assurance preserved | Risk or regression |
| --- | --- | --- | --- |
| Older superseded screenshot payloads | The machine run is older than latest plus one prior, the evidence store records payloadPruned true for the superseded run, and retained history includes source SHA, counts, and supersession reason. | Preserves run identity and retention history while removing old bulk images. | Fine-grained visual inspection of the old run requires deterministic regeneration from the pinned source. |
| Duplicate screenshot manifests in generated bundles | The bundle manifest references the retained source screenshot manifest and composed-service screenshot manifest, or a content-addressed archive preserves the same bytes. | Preserves reviewer bundle identity without storing duplicate manifest bytes. | Existing reviewer tools may expect copied manifests until compatibility is proven. |
| Duplicate generated evidence references | evidence-index.json, chain-of-custody.json, and service-evidence files are duplicated into the external review bundle and can be represented by manifest references or content-addressed transport in future work. | Preserves reviewer bundle linkage while reducing repeated lower-authority copies. | Bundle readers may need compatibility support before copied files are removed. |
| Empty screenshot bundle directories | The generated bundle manifest records the screenshot class as intentionally empty and reviewer tooling treats absence as equivalent to an empty directory. | Preserves generated bundle semantics without retaining empty filesystem scaffolding. | Directory-sensitive tooling could report false missing-artifact failures. |
| Derived previews or thumbnails | The full source screenshot remains retained and the derived asset is not referenced as proof evidence. | Preserves raw evidence while allowing review convenience assets to be regenerated. | Reviewers may lose a convenience view if regeneration tooling is unavailable. |
| Pass-only auxiliary visual diagnostics | The screenshot identity, hash, evidence row, and chain-of-custody row remain retained, and there are no warnings, gaps, failures, or human-review-required unresolved decisions for that auxiliary diagnostic. | Preserves proof evidence while reducing debug-only payloads. | Debug context for a passing route may require a fresh run or deterministic regeneration. |

Prunable means future-prunable. USF-619 does not prune any artifact.

## Regenerate Classes

These classes may be regenerated rather than retained as duplicated bytes if a
future implementation records the generator, inputs, source SHA, output hash,
and validation result.

| Class | Regeneration requirement | Validation expectation |
| --- | --- | --- |
| Generated screenshot galleries | Regenerate from retained screenshot manifests, retained screenshot bytes, route metadata, and run metadata. | Projection check must prove no fresh machine QA was claimed and generated output remains lower authority. |
| Generated Markdown or HTML reports containing screenshot references | Regenerate from retained evidence, screenshot manifests, and chain-of-custody records. | Proof-cockpit acceptance validation must preserve screenshot counts, hashes, non-claims, and generated-report boundaries. |
| External-review bundle screenshot indexes | Regenerate from the retained source run and bundle manifest. | Bundle manifest must point to retained source evidence or content-addressed transport artifacts. |
| Thumbnail or preview derivatives | Regenerate from retained full screenshots. | Hash or derivation metadata must distinguish preview bytes from source proof screenshots. |
| Screenshot comparison summaries | Regenerate from before and after manifests. | Stable screenshot identity with changed screenshot bytes must remain owner-review-required unless a future validator proves approved volatility. |

Regeneration must not be used to make stale retained evidence look current.

## Never Delete Without Owner Decision

Future optimisation must stop for explicit owner decision before deleting,
downgrading, or making unverifiable any of these screenshot-related artifacts:

- Screenshot bytes for the latest full machine-QA run while it is referenced by
  the evidence store as the latestMachineRun.
- Screenshot bytes for the one prior full run while the retention policy
  requires one prior full run.
- Screenshot manifest rows for accepted proof, human-review-required proof, or
  future golden-corpus entries.
- Any screenshot or screenshot-equivalent artifact referenced by evidence-index
  or chain-of-custody records used by accepted proof.
- Any screenshot whose byte hash changed while screenshot identity and evidence
  posture stayed stable, unless owner review accepts the drift or a future
  validator classifies it as approved volatility.
- Authenticated service screenshots or equivalent evidence pages that preserve
  credential-safe proof of service auth posture.
- Screenshots or screenshot equivalents tied to warnings, gaps,
  corrective-action records, residual-risk records, or human-import records.
- Validator fixtures or planted defects that prove screenshot hash, redaction,
  auth posture, missing screenshot, or screenshot-byte-drift behavior.
- Non-claim text or human acceptance boundary fields associated with
  screenshots.

## Retention Decision Rules

Future screenshot retention implementation should apply these rules in order:

1. Classify the changed paths with the evidence invalidation validator.
2. Identify whether the change touches screenshot bytes, screenshot manifests,
   evidence rows, chain-of-custody rows, generated projections, or reviewer
   convenience files.
3. Keep latest plus one prior full screenshot payloads unless the active
   retention policy is deliberately changed.
4. Preserve all screenshot identities, hashes, auth posture fields, redaction
   fields, human-review fields, and chain-of-custody links.
5. Treat missing screenshot paths, missing hashes, malformed hashes, and hash
   mismatches as blocking findings.
6. Treat stable-identity screenshot byte drift as owner-review-required.
7. Keep authenticated service screenshots and unsafe-to-capture equivalents
   until an explicit no-regression proof and owner decision permit a narrower
   retained set.
8. Keep generated reports and screenshot galleries lower authority than raw
   retained screenshot evidence.
9. Fall back to broader proof when a screenshot artifact cannot be classified.
10. Do not require fresh proof-cockpit machine QA for this policy itself; keep
    terminal fresh machine evidence deferred to USF-966.

## Validation Expectations For Future Implementation

Future implementation issues that prune, regenerate, compress, deduplicate, or
move screenshot artifacts should provide:

- Before and after screenshot file counts and byte sizes.
- Before and after screenshot manifest counts and screenshot IDs.
- Hash verification for every retained screenshot path.
- Evidence-index and chain-of-custody reference checks for every pruned or moved
  screenshot path.
- Proof-cockpit acceptance validation.
- Evidence invalidation and evidence reuse validation.
- Projection re-pin checks when generated reports, galleries, or review bundles
  change.
- Comparator output that preserves owner-review-required treatment for stable
  screenshot identity with changed bytes.
- Rollback instructions that restore any pruned bytes from the retained run,
  content-addressed archive, or deterministic regeneration path.

Fresh proof-cockpit machine QA should be reserved for issues that change runtime
proof collection behavior or for the terminal USF-966 refresh unless an earlier
issue records a stricter proof requirement.

## Acceptance Mapping For USF-619

USF-619 requires a policy defining what to keep, prune, regenerate, and never
delete without owner decision. This design satisfies that by:

- Defining keep classes in the Keep Classes table.
- Defining future-prunable classes in the Prunable Classes table.
- Defining regenerate classes in the Regenerate Classes table.
- Defining owner-decision boundaries in the Never Delete Without Owner Decision
  section.
- Recording validation and no-regression expectations for future screenshot
  retention implementation.

No screenshot artifact was deleted or pruned by this issue.
