# Adversarial Review Findings and Disposition

| | |
|---|---|
| **Document type** | Review record (committed for auditability) |
| **Status** | Active record of the whole-of-corpus adversarial review and its remediation. |
| **Scope** | USF `main`, reviewed across two passes plus a verification re-review. Linear tracking: USF-295 through USF-310. |

This document commits the review findings into the repository so they are auditable independently of the external tracker. It is a record, not semantic authority.

## Resolved and verified

| ID | Finding | Disposition |
|---|---|---|
| USF-295 | Proof-cockpit acceptance validator stale/red on HEAD | Resolved. Evidence rebound to current source; validator green; gate wired into CI. |
| USF-296 | Uncommitted proof-cockpit source in working tree | Resolved. Committed to main. |
| USF-305 | Chain-of-custody hashes never verified; evidence self-attested | Resolved. Validator recomputes sha256 of referenced files and fails on mismatch; 93/93 + 39/39 + 264/264 file-backed hashes verified; planted defect 028. |
| USF-306 | Overclaim scan bypassable; CI gap; two dead patterns | Resolved. CI runs repo:validate/parity/proof-cockpit; scan normalises case/markup/separators; dead `live-provider`/`usf-290` patterns repaired; README added to scan; planted defect 031. |
| USF-307 | Unauthenticated CSRF-able mutation endpoint; auto-attestation | Resolved. Writes gated by policy + CSRF double-submit + authenticated actor; confirmations explicit; live target moved out of repo. |
| USF-308 | Dead capability reference; no referential-integrity guard | Resolved. `public-proof-origin` ref repaired; validate-compose rule USF-COMPOSE-038 asserts every `usfCapabilityRefs` entry resolves to a declared semantic contract; planted defect added. |
| USF-310 | README asserted delivered/complete/full readiness, ungated | Resolved. README reframed to evidence-backed language; README added to the overclaim gate with regression patterns and a planted defect. |
| USF-290 | Proof cockpit human acceptance | Accepted by the accountable owner (Matthew Aldous) for the current-state hermetic scope; per-item acceptance baseline materialised for incremental delta review. |

## Delivered capability (incremental acceptance loop)

To make AI-led change sustainable, the acceptance model is now incremental:

- Each review item carries an **evidence fingerprint**. A recorded acceptance stands only while the item's fingerprint is unchanged; changed or new items return to the review queue, unchanged items carry acceptance forward automatically.
- **Automated promotion** (`proof-cockpit:promote`) rebinds a machine-QA run into the committed evidence store with no manual copying.
- The accountable owner therefore approves only the **affected subset** of any change, and each approval is recorded permanently with the item fingerprint.

## Open (honestly tracked)

| ID | Finding | Why still open |
|---|---|---|
| USF-298 | Command/reproducibility (jsonschema fail-open, undocumented prereq) | Partially addressed by CI pip install; remaining validator fail-open hardening not yet done. |
| USF-299 | Secret-in-URL DSN rendered by source viewer; narrow redaction scan | Not yet addressed; dev-hermetic placeholders only. |
| USF-300 | Circular service evidence; synthetic correlation/trace ids; per-record runId | Not yet addressed; evidence-quality depth. |
| USF-301 | Enterprise owners are self-labels; templated risk register | **Needs real organisational owner identities from the accountable owner** before it can be closed honestly. |
| USF-302 | Authority index (resolved) + docs/adr path-collision guard | AI-UI composition boundary now documented; the docs/adr collision guard remains. |
| USF-303 | Public payload non-claims not asserted by test; dual-impl drift | Not yet addressed. |
| USF-304 | Artifact accumulation; dangling run pointers | Retention policy documented; automated prune + pointer reconciliation pending (the next promotion rewrites the store). |
| USF-309 | Final-report warning line is a hardcoded literal | Not yet addressed; numbers currently agree but are not derived. |

None of the open items block AI/UI development testing on the accepted current-state foundation.
