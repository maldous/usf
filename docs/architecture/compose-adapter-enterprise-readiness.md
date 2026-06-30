# Compose Adapter Enterprise Readiness

Document type: Architecture / adapter evidence posture.
Status: Draft / USF-183.
Authority level: Runtime proof interpretation; subordinate to repository semantic authority,
validators, and executed proof output.

USF-183 hardens the implemented Compose-backed runtime adapters for local/dev/test proof. This
is enterprise evidence posture only. It is not enterprise production readiness, full dev
readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, staging
readiness, production readiness, test readiness, or full React parity.

## Adapter Requirements

Every implemented Compose-backed adapter must provide:

- bounded service-specific readiness retry with no arbitrary sleep;
- a real SDK/client-backed round trip against the composed service;
- value-free structured log evidence, trace evidence, metric evidence, and audit evidence;
- tenant-safe synthetic data only;
- fail-closed behavior and safe degraded/unavailable state;
- cleanup/teardown evidence where data is written;
- endpoint-ref, secret-ref, credential, token, payload, stack-trace, and SDK-error redaction;
- service catalogue and provider registry traceability.

Keycloak uses a longer local readiness budget because its admin endpoint can become usable
after Docker health succeeds. Other implemented adapters use bounded exponential readiness
retry with a `60s` local budget.

## Implemented Bindings

| Service | Adapter | SDK/client | Readiness policy | Evidence |
| --- | --- | --- | --- | --- |
| Postgres | `PostgresTenantMembershipRepository` | `pg@8.22.0` | bounded exponential, `60s` | readiness attempts, RLS tenant write/readback, trace/metric/audit/redaction |
| Keycloak | `KeycloakComposedIdentityProvider` | `@keycloak/keycloak-admin-client@26.2.5` | bounded exponential, `120s` | admin readiness, synthetic identity readback, fail-closed tenant check |
| Mailpit | `MailpitNotificationProvider` | `mailpit-api@2.1.0` | bounded exponential, `60s` | readiness, synthetic send, readback, cleanup |
| MinIO | `MinioObjectStore` | `minio@8.0.7` | bounded exponential, `60s` | bucket readiness, object write/read/delete, collision-free base64url per-segment tenant/object path encoding, tenant-boundary check |
| NATS | `NatsEventBus` | `@nats-io/transport-node@3.4.0` | bounded exponential, `60s` | connect, publish, readback, tenant-boundary check |
| Temporal | `TemporalComposedWorkflowEngine` | `@temporalio/*@1.18.1` | bounded exponential, `60s` | client/worker connect, schedule, execution result, cleanup |
| OpenBao | `OpenBaoSecretStore` | `node-vault@0.12.0` | bounded exponential, `60s` | health, write, describe, resolve, collision-free base64url per-segment tenant/secret path encoding, tenant-boundary check, cleanup |

## Validation

`tools/validate-runtime/validate-runtime.py` and `packages/proof/src/provider-adapters-proof.ts`
fail closed if a required binding is missing, deferred, unpinned, imported outside an adapter,
missing readiness retry, missing log/trace/metric/audit evidence markers, missing provider
registry linkage, exposing unsafe metadata, or allowing prohibited claims.
For tenant-scoped provider paths, validation also fails if a composed adapter uses lossy
normalisation that can map distinct tenant/object/secret values onto the same provider path.

Planted defects under `tools/validate-runtime/planted-defects/` cover the expanded binding and
adapter-hardening rule set.
