# 0009 Bootstrap Readiness Marker and Dev Test Boundary

## Status

Accepted.

## Description

Records the decision that the future `v2-bootstrap` marker is a movable, human-friendly bootstrap readiness marker only, and that the initial authorised implementation attempt it precedes is scoped to local dev/test readiness with in-memory dev providers and Docker Compose OSS test providers. This ADR creates no implementation code, no implementation directories, no Compose files, no migrations, and no production-readiness claim.

## Context

The active bootstrap goal requires USF to move as far as possible toward controlled V2 bootstrap readiness without starting implementation. The repository now has a bootstrap readiness governance record at `docs/architecture/bootstrap-readiness-governance.md`, a topology plan, a semantic source-use closure ledger, a machine-readable bootstrap mapping corpus, and `tools/validate-bootstrap` coverage for those records.

Those records capture decisions that affect future implementation permission, proof posture, provider targets, source-use boundaries, and tag movement. Under the Authority Model, a major architectural decision needs ADR coverage so it is rank-2 authority, not only planning prose or tracker context. Linear comments remain work tracking only and cannot define the bootstrap boundary.

Historical `../react` evidence is useful lineage for provider substrate, proof commands, Compose services, source-use treatment, and tenant/security posture. It remains rank-6 evidence. The future USF implementation must be freshly authorised and authored against USF semantics and source-use dispositions, not copied or path-mirrored from React.

## Decision

USF adopts the following bootstrap-readiness boundary.

The future `v2-bootstrap` marker is a movable human-friendly marker on `main`. It may be placed or moved only when governance, source-use treatment, topology, proof expectations, immutable proof/evidence anchors, and bootstrap validation support a later implementation attempt. The marker is not production readiness, not implementation completion, not USF-39 start authority, and not a substitute for immutable proof/evidence anchors.

Every accepted bootstrap candidate must have immutable proof/evidence anchors. Moving the marker must be explained in repository evidence or governance records and tracker comments. If blockers are found, the marker must not be created, moved, or relied on until the blockers are resolved.

The initial authorised implementation attempt after bootstrap is local dev/test readiness only. Dev targets in-memory providers. Test targets Docker Compose OSS providers. Staging, production, live-external-provider, deployment, and production-live proof are explicitly deferred and must not be claimed by bootstrap readiness.

The intended future topology recorded in governance artefacts is authority for planning only until a signed directive and separate USF-39 start action exist. Topology strings such as apps, capabilities, adapters, packages, and tests do not authorise directory creation before bootstrap. USF-39 remains Backlog until a signed USF-100 directive and a separate USF-39 start action exist.

Tenant isolation, break-glass, system job, migration/data, and supply-chain decisions recorded in `docs/architecture/bootstrap-readiness-governance.md` are binding bootstrap requirements for future implementation planning. They do not create runtime code or proof evidence by themselves.

## Rationale

The marker is useful as a human coordination point, but a tag alone cannot prove correctness. The Authority Model requires semantics, ADRs, validators, proof evidence, and source-use treatment to carry the actual authority. Keeping `v2-bootstrap` movable allows a human-friendly marker to follow the latest accepted candidate while immutable proof-anchor tags preserve auditability.

The dev/test boundary preserves the Charter's hermetic and locally provable posture without overclaiming live-provider or production readiness. It also prevents the initial authorised implementation pass from being blocked on staging, deployment, and production proof that cannot honestly exist before the implementation substrate exists.

Separating the marker from USF-39 start authority prevents accidental implementation start from a bootstrap tag, CI result, generated report, or Linear comment.

## Semantic References

- `docs/architecture/bootstrap-readiness-governance.md`
- `docs/architecture/target-implementation-topology-plan.md`
- `docs/architecture/semantic-source-use-closure-ledger.md`
- `docs/architecture/react-l5-equivalence-audit.md`
- `docs/architecture/implementation-extraction-directive.md`
- `docs/architecture/authority-model.md`
- `docs/architecture/charter.md`
- `spec/registries/bootstrap-mapping-index.json`
- `spec/instances/bootstrap-mapping/authentication-platform.json`
- `spec/instances/bootstrap-mapping/composed-provider-readiness-spine.json`
- `spec/instances/bootstrap-mapping/relational-storage-and-migrations-and-rls.json`
- `spec/instances/bootstrap-mapping/support-mode-break-glass-access.json`

## Source References

- `compose.yaml`
- `make/compose.mk`
- `docs/adr/0071-composed-provider-readiness.md`
- `docs/adr/0073-composed-service-sso-via-keycloak-oidc.md`

## Proof References

- `proof-anchor-89803a1`

## Validator References

- `tools/validate-bootstrap/validate-bootstrap.py`
- `tools/validate-spec/validate-spec.py`

## Invariants

- The `v2-bootstrap` marker is not production readiness.
- The `v2-bootstrap` marker is not implementation completion.
- The `v2-bootstrap` marker is not USF-39 start authority.
- USF-39 remains Backlog until a signed USF-100 directive and a separate USF-39 start action exist.
- Local dev/test bootstrap readiness must not claim staging, production, live-external-provider, deployment, or production-live proof.
- Future topology names are planning authority only before implementation is separately authorised.
- React remains source lineage only; no runtime source, config, Compose file, migration, test, or package scaffold is copied by this decision.

## Permitted Changes

- Strengthen `tools/validate-bootstrap` checks for marker policy, ADR coverage, topology planning, source-use coverage, proof deferrals, and forbidden implementation roots.
- Add or regenerate machine-readable bootstrap mappings and generated summaries where the JSON mapping remains authoritative.
- Add governance records, ADRs, and validator selftests that make bootstrap readiness more falsifiable.
- Move the future `v2-bootstrap` marker only after bootstrap blockers are resolved and repository evidence explains the move.

## Forbidden Drift

- Do not treat `v2-bootstrap` as production readiness, implementation completion, deployment readiness, or live-provider proof.
- Do not use `v2-bootstrap`, a proof-anchor tag, a generated report, or a Linear comment as permission to start USF-39.
- Do not create implementation roots or scaffold before the signed directive and separate start action.
- Do not weaken dev/test provider separation by allowing in-memory providers to satisfy test Compose proof.
- Do not treat React Compose, migrations, package layout, or source paths as target files to copy or mirror.

## Consequences

- Bootstrap readiness has rank-2 ADR coverage for its marker policy and dev/test boundary.
- `docs/architecture/bootstrap-readiness-governance.md` remains the detailed governance record, constrained by this ADR.
- `tools/validate-bootstrap` must fail closed if this ADR coverage is missing or loses the core boundary markers.
- The `v2-bootstrap` marker remains not attempted until all bootstrap blockers are resolved and validation plus immutable anchors support it.

## AI Alignment Rules

- Agents must read this ADR before creating, moving, or relying on a bootstrap readiness marker.
- Agents must preserve the distinction between local dev/test readiness and staging, production, live-external-provider, deployment, or production-live proof.
- Agents must stop before creating implementation roots or scaffold from this ADR alone.
- Agents must treat Linear comments as tracker context only and must verify repository artefacts and validators before claiming bootstrap readiness.

## Supersession

- Supersedes: none
- Superseded by: none

## Machine-Readable ADR Instance

- `tools/validate-spec/fixtures/positive/adr/0009-bootstrap-readiness-marker-and-dev-test-boundary.json`
