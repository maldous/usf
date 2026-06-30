# Enterprise Evidence Model

Document type: Architecture / evidence organisation.
Status: Draft / validator-enforced evidence model.
Date: 2026-06-30.

Linear tracks this work only. It does not define USF semantic authority.

## Purpose

`spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json` is the
repository-level enterprise evidence model every approved implementation lane must use. It
organises evidence for services, adapters, proofs, validators, deferred boundaries, lane
governance, and closure posture.

The model is schema-governed by `spec/schemas/enterprise-evidence.schema.json` and enforced by
`tools/validate-enterprise/validate-enterprise.py`.

## Required Evidence Sections

Each lane that adds implementation, proof, validator, adapter, or deferred-boundary work must
update the relevant model sections:

- Statement of Applicability support mappings for affected services, adapters, proofs,
  validators, and deferred boundaries.
- Evidence register rows with stable evidence ids, command pins, commit pins, issue links,
  runtime/provider mode, service-catalogue linkage, PR or merge commit reference, and retention
  posture.
- Threat model and abuse-case rows for affected adapters and lane work.
- SDK dependency governance rows for composed adapters, including exact version, selection
  rationale, licence posture, maintenance posture, advisory posture, compatibility, forbidden-layer
  import check, and update/deprecation owner.
- Logging, tracing, metrics, and audit evidence standard conformance.
- Access review posture for operator, admin, gateway, and control-plane surfaces.
- Backup, restore, and resilience posture for data-bearing services.
- Incident and vulnerability evidence posture.
- Privacy and data minimisation posture.
- Done-state governance and explicit non-claims.

## Done-State Boundary

Validation passing alone is not Done. A Linear issue can be moved to Done only when each
acceptance criterion has linked merged evidence, deferred items have linked follow-up issues,
non-claims are preserved, and service-disposition rows are closed, deferred with follow-up, or
explicitly out of scope.

Lane 1 is the only coordinator-approved implementation lane at this point. Lanes 2 through 7
remain blocked until the coordinator gate records human approval.

## Parallel Lane Readiness

Lane 1 creates the shared closure and enterprise evidence gate for later lane work. Future lanes
may run in parallel only after explicit coordinator approval. Each lane must own its evidence rows,
stable evidence ids, PR links, merge SHAs, validation commands, issue links, deferred boundaries,
and non-claims; one lane must not mark another lane complete.

Cross-lane dependencies must be linked explicitly in Linear and in the evidence model rather than
implied by shared validation. Future lanes can attach rows to the existing enterprise evidence
model without redefining the model, but shared files are expected merge-conflict hotspots:
`spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json`,
`spec/schemas/enterprise-evidence.schema.json`, `tools/validate-enterprise/validate-enterprise.py`,
`tools/validate-parity/validate-parity.py`, `package.json`, `Makefile`, and architecture/gap
register docs. Changes to shared validators or schemas must preserve existing Lane 1 checks and
planted defects.

No lane may claim full dev readiness or close USF-133 independently.

## Non-Claims

This model supports future enterprise evidence organisation and ISO/IEC 27001-style Statement of
Applicability support only. It does not claim ISO/IEC 27001 certification, SOC readiness,
production readiness, staging readiness, deployment readiness, live-provider readiness, full dev
readiness, enterprise production readiness, or full React parity.
