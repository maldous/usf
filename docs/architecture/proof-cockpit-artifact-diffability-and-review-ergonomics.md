# Proof Cockpit Artifact Diffability And Review Ergonomics

| Field | Value |
| --- | --- |
| Linear issue | USF-633 |
| Status | Design artifact for artifact review ergonomics |
| Scope | Diffability and reviewer workflow for proof-cockpit artifacts, generated reports, manifests, screenshots, and external review bundles |
| Authority posture | This document plans future review improvements only. It does not redefine USF semantic authority. |

## Purpose

USF proof and evidence artifacts are intentionally rich. They preserve route
coverage, screenshot evidence, service evidence, chain of custody, generated
reports, non-claims, and human-review boundaries. That richness makes future
review difficult when generated outputs are large, duplicated, or noisy.

This design identifies artifact classes that are hard to review and proposes
safe diffability improvements. It does not change artifact formats, delete
evidence, prune screenshots, change proof-cockpit logic, update validators, or
refresh proof-cockpit machine QA evidence.

## Non-Claims

This design does not claim staging readiness, product readiness, production
readiness, deployment readiness, live-provider readiness, store readiness,
release readiness, compliance certification, or human acceptance.

Generated reports, reviewer summaries, diff summaries, galleries, and bundle
indexes remain lower authority than semantic definitions, accepted ADRs,
validator rules, runtime proof evidence, retained raw artifacts, and chain of
custody. Review ergonomics must make raw evidence easier to inspect, not replace
it.

Fresh proof-cockpit machine evidence remains deferred to USF-966 unless a
future issue explicitly requires earlier proof and records that proof.

## Inputs Inspected

- docs/architecture/proof-artifact-retention-policy.md.
- docs/architecture/proof-cockpit-machine-qa-artifact-minimisation.md.
- docs/architecture/proof-cockpit-screenshot-retention-and-pruning-policy.md.
- docs/architecture/proof-cockpit-machine-qa-evidence-model.md.
- docs/architecture/generated-report-readiness-policy.md.
- docs/architecture/proof-freshness-publication-model.md.
- docs/architecture/proof-freshness-anchor-carrier-decision.md.
- artifacts/proof-cockpit/machine-runs/2026-07-06T15-10-33-975Z.
- artifacts/proof-cockpit/machine-runs/2026-07-06T15-06-30-097Z.
- proof-cockpit machine-run manifests, screenshot manifests, service evidence,
  evidence index, chain of custody, route manifests, generated Markdown and HTML
  reports, and external-review-bundle contents.
- tools/validate-proof-cockpit-acceptance, tools/validate-evidence-invalidation,
  and tools/validate-evidence-reuse planted-defect surfaces.

## Current Review Noise Baseline

The latest retained machine-QA run is
artifacts/proof-cockpit/machine-runs/2026-07-06T15-10-33-975Z. It is retained
context, not fresh current evidence for HEAD. It is pinned to source SHA
8a959501dbc1ecc0390c1e50388b94e8fbe20e8e.

The latest retained run contains 223 files and is approximately 53 MiB:

| Class | Count | Approximate size | Review issue |
| --- | ---: | ---: | --- |
| Screenshot PNG files | 94 | 32.66 MiB | Visual evidence dominates payload size and is hard to diff in text review. |
| Run-root JSON and generated reports | 23 | 12.47 MiB | The monolithic machine-QA run JSON is large, while generated reports are lower authority but visually noisy. |
| External review bundle files | 26 | 6.10 MiB | Many files duplicate root manifests byte-for-byte. |
| Service evidence JSON files | 40 | 0.32 MiB | Individual files are small but numerous and tied to service auth posture. |

The run has 118 JSON files, 10 Markdown files, one HTML file, and 94 PNG files.
The largest text artifacts are proof-cockpit-machine-qa-run.json at about 6.36
MiB, evidence-index.json at about 2.55 MiB, and chain-of-custody.json at about
1.95 MiB. The external review bundle duplicates evidence-index.json,
chain-of-custody.json, route-manifest.json, service manifests, screenshot
manifests, and other run manifests with identical bytes.

Empty external-review-bundle directories currently include commands, console,
network, page-html, screenshots, and source-documents. Their existence may help
some reviewer tooling, but they add filesystem noise and can be represented by
explicit manifest entries in future work if compatibility is proven.

## Noisy Artifact Classes

| Artifact class | Current examples | Why review is noisy | Assurance that must remain visible |
| --- | --- | --- | --- |
| Large screenshot corpus | screenshots/*.png | Binary diffs do not show meaningful semantic change, and 94 files dominate retained payload size. | Screenshot hashes, screenshot IDs, route or service mapping, auth posture, redaction posture, human-review state, evidence-index rows, and chain-of-custody rows. |
| Monolithic run JSON | proof-cockpit-machine-qa-run.json | The file aggregates route, service, capability, screenshot, evidence, custody, and report data, so small semantic changes create broad diffs. | Run identity, source SHA, rerun mode, counts, non-claims, warning state, human-decision state, and references to source manifests. |
| Evidence and custody indexes | evidence-index.json, chain-of-custody.json | Large arrays make row-level changes hard to inspect without stable grouping and summaries. | Claim-to-evidence traceability, content hashes, metadata hashes, environment, provider mode, source SHA, human-review state, and validation result. |
| Duplicate external-review bundle manifests | external-review-bundle copies of root manifests | Byte-identical copies create repeated diffs and make reviewers check the same content twice. | Bundle identity, source-run linkage, manifest hashes, lower-authority generated report boundary, and compatibility for bundle consumers. |
| Generated Markdown and HTML reports | proof-cockpit-machine-qa-report.md, proof-cockpit-machine-qa-report.html, external-review-report.md | Formatting changes can obscure whether the underlying proof evidence changed. | Reports must cite retained evidence and non-claims, and must not be treated as proof without underlying artifacts. |
| Route fan-out records | route-manifest.json | The current manifest has 830 route records, including high-count evidence, scenario, claim, screenshot-detail, capability, semantic-definition, service, and enterprise route families. | Route coverage, role, auth requirement, route status, gap visibility, screenshot links, and non-claim checks. |
| Service evidence pages | service-evidence/*.json and compose-service screenshot equivalents | Many records are small, but they carry auth posture and reenactment context that can be lost in aggregate diffs. | Service ID, capability mapping, target observation, credential-safe posture, redaction status, synthetic-data confirmation, and human reenactment instructions. |
| Empty generated bundle directories | external-review-bundle/commands, console, network, page-html, screenshots, source-documents | Empty directories are hard to interpret in review and may appear as missing evidence when omitted. | A manifest-level declaration that the class is intentionally empty and whether tooling expects the directory. |
| Volatile generated metadata | run IDs, timestamps, temporary paths, localhost ports, durations, generated artifact roots, and action IDs | Repeatedly changes in lower-authority projections can hide the fields reviewers actually need to inspect. | Raw evidence must keep original values; generated summaries may normalize only when they preserve source references and hashes. |
| CI-facing artifact views | future workflow summaries or uploaded artifact bundles | A raw bundle upload can overwhelm PR review or encourage reviewers to trust a generated projection. | CI summaries must show changed classes, counts, hashes, source SHA, validation state, and non-claim state while retaining raw evidence for inspection. |

## Safe Diffability Improvements

These improvements are safe to define for future implementation because they
add reviewer visibility while preserving raw evidence and fail-closed proof
discipline.

| Improvement | Review value | Assurance preserved or added | Implementation boundary |
| --- | --- | --- | --- |
| Manifest-first review summary | Gives reviewers a compact entry point listing changed artifact classes, counts, hashes, source SHA, and non-claim status before they inspect bulk files. | Adds explicit coverage of source-run linkage, evidence counts, screenshot counts, warning counts, and generated-report lower authority. | Must be generated from retained manifests and never replace them. |
| Stable grouping and ordering for summaries | Groups evidence by route family, service, screenshot class, capability, and custody class. | Makes row-level drift easier to inspect without dropping any records. | Must not reorder canonical raw files unless the owning validator and no-regression path allow it. |
| Duplicate-manifest digest table | Shows whether external-review-bundle manifest copies match root manifests. | Preserves bundle compatibility while exposing duplicate bytes and hash drift. | Future deduplication requires bundle compatibility validation. |
| Screenshot diff index | Lists screenshot IDs, class, source path, hash, byte size, auth posture, redaction posture, and review state. | Preserves screenshot identity and owner-review treatment for stable identity with byte drift. | Must not prune or downsample source screenshots. |
| Generated-report drift summary | Separates formatting-only generated report changes from underlying evidence, route, screenshot, and custody changes. | Keeps generated reports lower authority and makes hidden proof drift harder. | Projection checks must fail if report counts, non-claims, source SHA, or artifact references drift unexpectedly. |
| Route-family coverage table | Summarizes high-fan-out route groups, screenshot-linked routes, and pass/warn/fail/gap counts. | Preserves route coverage while making expensive route families visible. | Must not skip route execution; incremental execution remains a separate future decision. |
| Service evidence posture table | Summarizes service auth posture, direct screenshot, authenticated screenshot, unsafe-to-capture equivalent, and cli-equivalent classes. | Preserves provider and auth posture boundaries. | Must retain detailed service evidence files and reenactment instructions. |
| Bundle emptiness manifest | Records empty generated classes explicitly instead of relying only on directories. | Prevents omission of empty directories from being mistaken for missing evidence. | Directory omission is future work and needs bundle consumer compatibility proof. |
| Volatile field normalization in projections | Masks or groups known volatile fields in generated summaries while linking to raw evidence. | Reduces noisy projection diffs while preserving raw run metadata and content hashes. | Normalized summaries must never be used to satisfy proof freshness or raw evidence requirements. |
| CI artifact summary | Presents changed artifact classes, counts, hashes, source SHA, validation result, and non-claim state in CI output. | Makes PR review faster without uploading duplicate raw bundles by default. | CI status and summaries remain non-authoritative and cannot replace validators or retained evidence. |
| Reviewer guide | Gives a deterministic order for reviewing raw evidence after reading summaries. | Reduces missed warnings, gaps, non-claims, and human-review fields. | Guide is advisory and cannot define semantic authority. |

## Reviewer Workflow Proposal

Future reviewer-facing tooling should present artifact changes in this order:

1. Run identity, source SHA, repository state, selected rerun mode, and non-claim
   status.
2. Pass, fail, warning, review-required, and human-decision counts.
3. Changed raw evidence classes and generated projection classes.
4. Route-family coverage and screenshot-linked route counts.
5. Screenshot index with byte hashes and auth posture.
6. Service evidence posture matrix.
7. Evidence-index and chain-of-custody row changes.
8. External-review-bundle duplicate manifest digest.
9. Generated report drift summary.
10. Links to retained raw artifacts for detailed inspection.

This order makes summaries a navigation layer. It does not allow summaries,
generated reports, or bundle indexes to satisfy proof by themselves.

## Future Review Summary Contract

A future diffability summary should include:

- Source run ID, source SHA, deployment SHA, environment, selected rerun mode,
  and generated-at timestamp.
- Artifact inventory by class, file count, total bytes, and content hash where
  practical.
- Route-family count, screenshot-linked route count, and pass/warn/fail/gap
  totals.
- Screenshot count, screenshot class counts, and hash drift status.
- Service evidence count, service auth posture count, and unsafe-to-capture
  equivalent count.
- Evidence-index and chain-of-custody record counts.
- External-review-bundle duplicate manifest status.
- Generated report status with explicit lower-authority language.
- Volatile fields present in raw evidence and normalized fields present only in
  generated projections.
- CI summary state when the diff appears in automation.
- Non-claim status and human-review or human-decision status.
- A fallback instruction requiring raw artifact inspection on ambiguity.

## Review Guardrails

Future diffability work must preserve these guardrails:

- Raw evidence, manifests, screenshots, evidence-index rows, and
  chain-of-custody rows remain inspectable.
- Generated reports and summaries do not become proof authority.
- Projection-only re-pinning and generated summary refreshes must not be
  described as fresh machine QA, fresh proof, or current-commit proof.
- Missing, stale, unknown, or generated-only evidence fails closed.
- Warning, gap, corrective-action, residual-risk, and human-review fields remain
  visible.
- Stable screenshot identity with changed bytes remains owner-review-required
  unless a future validator classifies the drift as approved volatility.
- Duplicate bundle reduction requires content-hash validation and compatibility
  proof.
- Empty directory omission requires an explicit manifest declaration and
  consumer compatibility proof.
- Ambiguous affected-only or incremental results fall back to broader proof.
- Fresh proof-cockpit machine QA remains deferred to USF-966 unless a future
  issue records a stricter proof need.

## Validation Expectations For Future Implementation

Future implementation issues that add review summaries, diff indexes, bundle
digests, or generated-report comparisons should provide:

- Before and after artifact inventory with counts, byte sizes, and classes.
- Evidence invalidation classification for changed artifact and proof paths.
- Validation that source manifests, evidence index, chain of custody, screenshot
  manifests, and service evidence remain present or explicitly referenced.
- Projection checks proving generated reports and summaries do not overclaim.
- Checks that volatile field normalization never mutates raw retained evidence
  and never hides hash, source SHA, warning, gap, non-claim, or human-review
  drift.
- CI summary checks when workflow output is changed, with no treatment of CI
  status as proof authority.
- Proof-cockpit acceptance validation.
- Evidence reuse and evidence invalidation validation.
- Planted defects for hidden warning, missing non-claim, stale evidence treated
  as pass, generated-report-only proof, hash mismatch, missing screenshot hash,
  and bundle metadata drift where the implementation touches those classes.
- Rollback instructions that restore the previous review output shape.

## Acceptance Mapping For USF-633

USF-633 requires a proposal identifying noisy artifact classes and safe
diffability improvements. This design satisfies that by:

- Identifying noisy artifact classes in the Current Review Noise Baseline and
  Noisy Artifact Classes sections.
- Defining safe review improvements in the Safe Diffability Improvements
  section.
- Preserving raw evidence, screenshots, manifests, chain of custody, non-claims,
  and generated-report lower-authority boundaries.
- Recording future validation expectations and implementation guardrails.

No artifact format was changed, and no evidence, screenshot, proof output, or
generated report was deleted or pruned by this issue.
