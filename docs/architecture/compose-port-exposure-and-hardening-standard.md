# Compose Port Exposure and Hardening Standard

## Status

Draft governance standard for generated Compose port exposure and local hardening.

This standard supports generated Compose classification and validation. It does not
authorise production readiness, staging readiness, ISO/IEC 27001 certification, SOC
readiness, live monitoring readiness, legal readiness, or regulatory readiness.

## Authority

Port exposure is semantic authority, not incidental Compose syntax. A host-published
port changes access posture, operator workflow, local evidence collection, and
collision risk. Generated Compose therefore MUST derive host publication from the
Compose service catalogue, not from image defaults or hand-authored YAML strings.

Generated Compose remains derivative. The Compose service catalogue and its schema
are the authority for service and port exposure policy.

## Host Bind Policy

Local generated Compose ports MUST bind to `127.0.0.1` by default.

Generated local ports MUST declare:

- host IP
- bind scope
- exposure class
- access model
- auth requirement
- audit requirement
- TLS posture
- production exposure boundary
- readiness claim boundary

LAN or public binds are prohibited unless a future accepted authority explicitly
permits them and the catalogue records that authority. Image-exposed ports MUST NOT
be published merely because a container image exposes them.

## Internal-Only Services

Services required only for Compose-internal dependencies SHOULD use Compose
networking without host publication. A service MAY publish a host port only when the
catalogue records a developer, test, operator, assurance, evidence, or control-plane
purpose for that port.

## Operator and Admin Exposure

Operator, admin, assurance, gateway, identity, secret, and workflow UI ports MUST
record access policy, authentication requirement, audit posture, operator/admin
surface flags, data classification, risk owner, evidence produced, and readiness
claim boundaries.

Local credentials in generated Compose are non-production bootstrap placeholders
only. They MUST NOT be treated as ordinary configuration, production secrets, or
evidence of production secret posture.

## Profile-Gated Exposure

Profile-gated services MAY publish additional loopback ports only when the semantic
port policy records the profile scope. Validators MUST check profile-combination
port conflicts before generated Compose is accepted.

## Cross-Environment Concurrency

The default USF generated Compose strategy is not-concurrent:

- dev, test, and staging generated Compose targets reuse fixed loopback host ports;
- they are not concurrently runnable by default;
- side-by-side execution requires a future explicit environment-offset or dynamic
  port allocation policy.

Validators MUST reject duplicate fixed ports across environments if a port claims
concurrent safety without an offset or dynamic allocation policy.

## Production Exposure

Production generated Compose is a policy and requirements representation. It MUST
remain valid Compose by design, but it is not a runnable production deployment
claim. Production requirements SHOULD select external-managed or cloud-provider
realisations unless a later accepted authority explicitly permits generated local
production services.

Production local host ports are prohibited by default. Production external or cloud
requirements MUST record exposure boundaries rather than silently omitting ports.

## Secret Handling

Generated local Compose MAY contain explicit local-only bootstrap placeholders when
the validator recognises them as placeholders and no production readiness is
claimed. These placeholders are not secret authority and MUST NOT be copied into
evidence logs as live secrets.

Production, evidence, generated reports, and production requirement records MUST
NOT contain raw secret values outside an explicitly allowed placeholder mechanism.

## ISO-Supporting Control Posture

The catalogue may record ISO/IEC 27001-supporting technical control metadata such as
control purpose, risk owner, access model, audit requirement, bind scope, retention
or logging posture, evidence produced, and deferred controls.

This metadata supports control evidence organisation only. It does not claim
ISO/IEC 27001 certification, SOC readiness, legal readiness, regulatory readiness,
SIEM readiness, live monitoring readiness, staging readiness, or production
readiness.

## Non-Claims

This standard does not claim full React parity.

This standard does not claim dev-universal readiness.

This standard does not claim staging or production runtime readiness.

This standard does not claim ISO/IEC 27001 certification or SOC readiness.

This standard does not authorise USF-133 closure.

This standard does not copy React runtime code or make React source live authority.

This standard does not self-accept any Linear issue, directive, or future
implementation step.
