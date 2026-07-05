# Environment Promotion Enterprise Standard

Document type: Architecture / environment promotion standard.
Status: Draft / validator-enforced gate definition.
Issue scope: USF-193.
Parent: USF-133.

Linear tracks this work only. It does not define USF semantic authority.

## Purpose

This standard defines how USF separates dev, test, staging, and production promotion gates. It
exists because previous records define parts of the boundary, but no single repository artefact
previously made the environment-promotion model machine-checkable.

The machine-readable authority for this standard is
`spec/instances/environment-promotion/environment-promotion-enterprise-standard.json`, governed by
`spec/schemas/environment-promotion.schema.json` and validated by
`tools/validate-enterprise/validate-enterprise.py`.

This standard defines gates only. It does not claim that any gate has passed.

## Environment Definitions

| Environment | Class | Provider posture | Data posture | Destructive posture | Current claim boundary |
|---|---|---|---|---|---|
| Dev | local | hermetic-mock by default; local-composed-real-service only for specific proof boundaries | disposable synthetic data | disposable local proof is allowed | bounded dev evidence only |
| Test | integration | local-composed-real-service for required services/providers | synthetic resettable data | destructive reset, migration, rollback, purge, failure, and tenant-isolation tests are expected where applicable | no test readiness claim from this issue |
| Staging | staging | production-shaped rehearsal using local composed or external sandbox providers as separately authorised | controlled non-production data | non-destructive release and migration rehearsal | no staging readiness or production-live claim |
| Production | production-live | live authorised providers only | governed production data | non-destructive live operation | no production readiness or live-provider claim from this issue |

## Promotion Rules

- Dev evidence does not satisfy test readiness.
- Test evidence does not satisfy staging readiness.
- Staging evidence does not satisfy production readiness.
- Production readiness requires explicit production-live evidence and approval.
- Hermetic or in-memory providers do not satisfy composed-provider proof.
- Destructive test semantics do not satisfy staging or production posture.
- Generated reports do not replace emitted and collected proof evidence.
- Readiness claims must not exceed proof level, provider mode, environment class, freshness, and approval evidence.

## Enterprise Evidence Posture

Every future readiness assessment that relies on this standard must record:

- owner, risk owner, control owner, and evidence owner;
- risk statement, threat/failure scenario, impact, likelihood, treatment, review date, and follow-up issue;
- Statement of Applicability support mapping;
- service catalogue and provider-mode linkage where services or adapters are involved;
- data classification, tenant boundary, access boundary, secret boundary, audit posture, retention/purge posture, and privacy boundary;
- incident, vulnerability, dependency, SBOM, secure SDLC, release, rollback, backup/restore, and supplier/subprocessor posture where relevant;
- evidence id, commit SHA, PR, issue, validation commands, approver, review expiry, exceptions, and non-claims.

These rows support future enterprise assurance and ISO/IEC 27001-style evidence organisation only.
They do not claim ISO/IEC 27001 certification or SOC readiness.

## Service Disposition Dependency

USF-167 remains the service-disposition execution gate. This standard tells USF-167 and later
source issues how to avoid environment/readiness overclaiming, but it does not close any
service-disposition row. A required service or provider that is missing implementation, proof,
explicit deferral, or accepted out-of-scope rationale continues to block stronger readiness
claims.

## Negative Assurance

This standard explicitly does not prove:

- full dev readiness;
- test readiness;
- staging readiness;
- production readiness;
- deployment readiness;
- live-provider readiness;
- SOC readiness;
- ISO/IEC 27001 certification;
- enterprise production readiness;
- full product readiness;
- USF-133 closure.

Validation passing for this standard means the gate is represented and enforceable. It does not
mean the project is ready for any environment, and it does not move source issues to Done.

## Validation

The environment-promotion gate is enforced by:

- `python3 tools/validate-spec/validate-spec.py all --json`
- `python3 tools/validate-enterprise/validate-enterprise.py all --json`
- `corepack pnpm parity`

Future implementation or provider work may require runtime, Compose, or provider-specific
validation in addition to this standard.
