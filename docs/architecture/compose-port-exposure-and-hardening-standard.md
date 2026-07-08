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

Semantic duplicate and profile-combination validation is mandatory and host-state
independent. Runtime host-port availability checks are a local preflight, not part
of ordinary semantic validation:

- `compose:validate` validates catalogue and generated-file policy only;
- `compose:ports:dev` runs before the default dev smoke command because that path
  is about to start local Compose;
- `compose:ports:test`, `compose:ports:staging`, and `compose:ports:profiles`
  remain explicit preflight targets unless those environments or profiles are
  actually about to be started.

This avoids failing general verification because an optional profile port, or a
port for an environment not being started, is occupied on a developer host.

## Local Port Conflict Diagnostics and Safe Smoke

When local Compose smoke fails because a required loopback port is occupied, the
first diagnostic step is the target-specific port preflight:

```bash
corepack pnpm compose:ports:dev
```

The preflight is repeatable and non-destructive. It reports occupied required dev
ports without stopping services. A failed preflight is an actionable local host
state conflict, not a semantic validation pass and not proof that Compose may fall
back to in-memory behaviour.

When a smoke rerun is needed on a developer machine that may already have a
default Compose project, use an explicit temporary project name:

```bash
COMPOSE_PROJECT_NAME=usfsmoke-local corepack pnpm compose:smoke
```

The temporary project name scopes the `up` and `down --remove-orphans` lifecycle
to the smoke project instead of the default repository project. Agents and
developers MUST NOT stop or remove unrelated user services to clear a port unless
the user explicitly instructs that action. If the preflight still reports a
conflict, the safe remediation is to identify the owning local process or stack
and request explicit action before stopping it.

Passing this local smoke path proves only that the bounded local dev Compose
preflight and smoke lifecycle completed on the current host. It does not claim
staging readiness, production readiness, provider readiness, deployment readiness,
or full test readiness.

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
the Compose service catalogue lists the exact value in its finite
`approvedLocalSecretPlaceholders` set and no production readiness is claimed.
Substring matches are not accepted. Values such as `prod_password`,
`real_password`, credential-bearing DSNs not in the finite set, or arbitrary token
strings fail validation.

These placeholders are not secret authority and MUST NOT be copied into evidence
logs as live secrets.

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

This standard does not claim full product readiness.

This standard does not claim dev-universal readiness.

This standard does not claim staging or production runtime readiness.

This standard does not claim ISO/IEC 27001 certification or SOC readiness.

This standard does not authorise USF-133 closure.

This standard does not copy source-lineage runtime code or make source lineage live authority.

This standard does not self-accept any Linear issue, directive, or future
implementation step.
