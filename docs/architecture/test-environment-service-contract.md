# Test Environment Service Contract

|                     |                                                          |
| ------------------- | -------------------------------------------------------- |
| Issue scope         | USF-235                                                  |
| Parent gate         | USF-234                                                  |
| Machine-readable    | docs/architecture/test-environment-service-contract.json |
| Service authority   | spec/instances/compose-service/service-catalogue.json    |
| Test Compose target | compose/compose.test.generated.yaml                      |

This contract defines the service-backed boundary for the test-readiness track.
It builds on the dev-ready foundation without reopening dev readiness.

The hard rule is simple: a required service-backed test-readiness claim must use
the composed test target. It cannot be satisfied by an in-memory, process-local,
hermetic, or mock substitute unless the capability is explicitly classified as
pure local computation or external/live provider work outside the local
test-readiness scope.

## Contract Shape

The machine-readable contract records:

- capability dependency classes;
- the canonical test Compose target;
- every required test service catalogue row;
- whether the row is default or profile-gated;
- whether in-memory substitution is allowed;
- reset, seed, cleanup, teardown, and determinism posture;
- validation commands and follow-up ownership;
- enterprise evidence references and explicit non-claims.

USF-235 defines the service contract only. USF-236 migrates the composed
semantic harness, USF-237 proves deterministic fixture lifecycle, USF-238 adds
the final command surface and CI/local gate, and USF-234 performs final
acceptance.

## Non-Claims

USF-235 does not claim final test readiness, staging readiness, production
readiness, deployment readiness, live-provider readiness, SOC readiness,
ISO/IEC 27001 certification, enterprise production readiness, product UI
readiness, browser E2E readiness, full React product parity, or USF-133
closure.
