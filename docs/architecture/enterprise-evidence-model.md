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
- Lane-owned access posture matrices where a lane needs machine-checkable owner, exposure,
  authn/authz, audit, deferred-risk, control/evidence, incident, privacy, and non-claim
  evidence beyond the shared service catalogue.
- Backup, restore, and resilience posture for data-bearing services.
- Incident and vulnerability evidence posture.
- Privacy and data minimisation posture.
- Done-state governance and explicit non-claims.

## Done-State Boundary

Validation passing alone is not Done. A Linear issue can be moved to Done only when each
acceptance criterion has linked merged evidence, deferred items have linked follow-up issues,
non-claims are preserved, and service-disposition rows are closed, deferred with follow-up, or
explicitly out of scope.

Lane 1 is complete. Lanes 2 through 7 are coordinator-approved for implementation after the
human approval recorded on USF-192. Approval is bounded by each lane issue and the Lane 1
enterprise, closure, and evidence gates. USF-133 closure remains blocked until all lane evidence is
merged and reconciled.

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

## Lane 3 Assurance Control Planes

USF-187 records shared assurance control-plane posture for Sentry/error monitoring,
SonarQube/static analysis, and security scanning with Lane-owned `usf-187` evidence ids.
Each control-plane bundle records owner, risk owner, control owner, effectiveness state,
risk statement, threat/failure scenario, affected asset/service, impact, likelihood, treatment,
review date, follow-up issue, validation command, deferred boundary, rollback boundary,
incident/vulnerability posture, privacy/data minimisation posture, and explicit non-claims.

The Lane 3 validator coverage is:

- USF-ENTERPRISE-011: missing assurance control-plane disposition, missing effectiveness state,
  missing risk/treatment metadata, missing source issue linkage, or missing closure-matrix
  evidence linkage.
- USF-ENTERPRISE-012: unsupported assurance readiness, implementation, operating-evidence,
  SOC, ISO/IEC 27001 certification, live-provider, deployment, production, test, full-dev,
  enterprise-production, or full product readiness overclaim.

The model remains evidence organisation only. USF-205 records accepted local Sentry SDK-envelope
proof for event-shape capture, redaction, tenant-safe labels, value-free retention posture, and
unavailable-transport fail-closed behaviour, but Sentry service readiness, service ingestion,
issue lifecycle, alert handoff, incident workflow, operator console access, live-provider
operation, and environment promotion remain deferred unless later merged evidence closes the
linked follow-up issues. SonarQube service quality-gate proof is bounded by USF-204, and security
scanner operating evidence remains bounded by its source issue scope.

## Non-Claims

This model supports future enterprise evidence organisation and ISO/IEC 27001-style Statement of
Applicability support only. It does not claim ISO/IEC 27001 certification, SOC readiness,
production readiness, staging readiness, deployment readiness, live-provider readiness, full dev
readiness, enterprise production readiness, or full product readiness.
