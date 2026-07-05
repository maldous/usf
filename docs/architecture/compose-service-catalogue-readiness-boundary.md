# Compose Service Catalogue Readiness Boundary

Document type: Architecture note.
Status: Draft governance note.
Authority level: explanatory architecture note subordinate to the Charter, Authority Model, schema registry, service catalogue, validators, ADRs, and runtime proof evidence.

## Authority

`spec/instances/compose-service/service-catalogue.json` is the semantic authority for Compose service disposition.

Generated Compose files under `compose/` are derivative. They must be regenerated from the catalogue and must not be used to redefine service semantics.

The catalogue is governed by `spec/schemas/compose-service.schema.json`, the schema registry entry for `compose-service.schema.json`, and `tools/validate-compose/validate-compose.py`.

## Durable Metadata

Every service records owner, risk owner, control owner, purpose, environment disposition, provider boundary, data classification, data boundary, readiness tier, evidence grade, control purpose, asset inventory class, access posture, authentication requirement, audit posture, audit requirement, secret posture, backup/restore posture, retention posture, tenant boundary, operational owner boundary, operator access boundary, shared-control-plane justification, break-glass relevance, missing evidence, ISO/IEC 27001-supporting posture, enterprise feature support posture, and allowed/prohibited readiness claims.

These fields make the catalogue usable as a CMDB-style foundation asset. They do not make the catalogue a production CMDB, supplier register, incident register, access-review system, or certification package.

## Readiness Boundary

The catalogue may support bounded dev-foundation service disposition and generated Compose derivation.

It does not claim full product readiness, full dev readiness, test readiness, staging readiness, production readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, legal readiness, or regulatory readiness.

Evidence grades C, D, or F require explicit missing-evidence or deferred-boundary metadata before a service can carry a stronger catalogue tier.

## ISO And Enterprise Posture

The `iso27001Support` and `enterpriseFeatureSupport` objects support evidence organisation for asset inventory, ownership, access boundary, privileged access boundary, audit evidence, backup/restore and resilience posture, supplier/provider boundary, secret/credential boundary, change/promotion evidence, incident-response evidence, and Statement of Applicability mapping.

They are support fields only. `certificationClaimed` must remain false, and validators reject prohibited readiness or compliance claims.

## Shared, Admin, Data, And External Boundaries

Shared control-plane services must justify why sharing is allowed and must record risk owner, access posture, audit posture, data boundary, tenant boundary, operational owner boundary, and readiness non-claims.

Admin and operator surfaces must record authentication requirement, audit requirement, break-glass relevance, operator access boundary, and prohibited readiness claims.

Data-bearing services must record data classification, tenant boundary, backup/restore posture, retention/logging posture, and failure impact.

External, cloud, deferred, and out-of-scope services must record provider/deferred boundary, missing evidence, and prohibited claims until evidence exists.
