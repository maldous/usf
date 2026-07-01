# Operator Admin Access Review And Deprovisioning Proof Depth

USF-217 records the current selected-closure-tier disposition for operator and administrator console access review and deprovisioning depth. It is evidence organisation and validation input, not a readiness claim.

## Boundary

- In scope: service catalogue surfaces represented by docs/architecture/operator-access-gateway-posture-matrix.json.
- Current result: every row has explicit access-review and deprovisioning posture.
- Deferred execution: recurring review execution, provider-console revocation, identity lifecycle integration, clickthrough SSO, and stronger operator readiness move to USF-221.
- Public exposure remains denied and unclaimed.
- USF-133 remains open.

## Surface Table

| Service | Surface | Access model | Review posture | Deprovisioning posture | Owner | Follow-up |
|---|---|---|---|---|---|---|
| keycloak | admin-surface | admin-only | deferred-to-USF-221 | deferred-to-USF-221 | platform-identity-foundation | USF-221 |
| minio | admin-surface | admin-only | deferred-to-USF-221 | deferred-to-USF-221 | platform-files-foundation | USF-221 |
| openbao | admin-surface | admin-only | deferred-to-USF-221 | deferred-to-USF-221 | platform-security-foundation | USF-221 |
| prometheus | control-plane-no-human-access | no-human-access | deferred-to-USF-221 | deferred-to-USF-221 | platform-observability-foundation | USF-221 |
| grafana | operator-surface | developer-access | deferred-to-USF-221 | deferred-to-USF-221 | platform-observability-foundation | USF-221 |
| loki | control-plane-no-human-access | no-human-access | deferred-to-USF-221 | deferred-to-USF-221 | platform-observability-foundation | USF-221 |
| tempo | control-plane-no-human-access | no-human-access | deferred-to-USF-221 | deferred-to-USF-221 | platform-observability-foundation | USF-221 |
| mailpit | operator-surface | developer-access | deferred-to-USF-221 | deferred-to-USF-221 | platform-messaging-foundation | USF-221 |
| pgadmin | admin-operator-surface | operator-access | deferred-to-USF-221 | deferred-to-USF-221 | platform-operations-foundation | USF-221 |
| sonarqube | operator-surface | developer-access | deferred-to-USF-221 | deferred-to-USF-221 | platform-assurance-foundation | USF-221 |
| alertmanager | admin-operator-surface | operator-access | deferred-to-USF-221 | deferred-to-USF-221 | platform-observability-foundation | USF-221 |
| windmill | admin-operator-surface | operator-access | deferred-to-USF-221 | deferred-to-USF-221 | platform-operations-foundation | USF-221 |
| temporal-ui | admin-operator-surface | operator-access | deferred-to-USF-221 | deferred-to-USF-221 | platform-operations-foundation | USF-221 |
| sentry | operator-surface | external-provider-console | deferred-to-USF-221 | deferred-to-USF-221 | platform-observability-foundation | USF-221 |
| caddy | gateway | operator-access | deferred-to-USF-221 | deferred-to-USF-221 | platform-access-foundation | USF-221 |

## Non-Claims

- full-dev-readiness
- test-readiness
- staging-readiness
- production-readiness
- deployment-readiness
- live-provider-readiness
- soc-readiness
- iso27001-certification
- enterprise-production-readiness
- full-react-parity-readiness
- public-operator-exposure
- operator-console-readiness
- USF-133-closure

## Validation

The repository gate is tools/validate-enterprise/validate-enterprise.py all with JSON output. USF-ENTERPRISE-025 fails closed if this artefact is missing, if a service row is missing, if TODO placeholders remain, if follow-up linkage is missing, or if readiness/public exposure is overclaimed.
