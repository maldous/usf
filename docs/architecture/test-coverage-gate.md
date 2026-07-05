# Test Coverage Gate

USF-240 defines the bounded LCOV and Sonar coverage gate for the test-readiness
track. The machine-readable evidence is
`docs/architecture/test-coverage-gate.json`.

The canonical coverage commands are `corepack pnpm test:coverage` and
`corepack pnpm test-readiness:coverage`. They generate LCOV under
`coverage/test-readiness/` and enforce 100 percent line, statement, function,
and branch coverage for the declared in-scope implementation files.

The gate is intentionally bounded. It does not claim repository-wide coverage,
final USF-234 acceptance, test readiness by itself, or any staging, production,
deployment, live-provider, SOC, ISO certification, enterprise production,
product UI, browser E2E, or full product readiness. Broad source
trees that require composed-service execution or later acceptance ownership are
recorded as bounded deferred coverage scope in the JSON evidence.

Sonar LCOV import is covered in two places:

- `sonar-project.properties` points Sonar at the bounded local LCOV report.
- `corepack pnpm proof:assurance:sonarqube` creates and imports a synthetic
  LCOV report into the local composed SonarQube proof, then records LCOV import
  evidence without exposing endpoints, tokens, raw scanner logs, stack traces,
  or provider payloads.

Future expansion of the coverage scope must update semantic obligations,
coverage evidence, command-surface evidence, validator rules, planted defects,
enterprise evidence, and non-claims in the same PR.
