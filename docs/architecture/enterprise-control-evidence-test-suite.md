# Enterprise Control Evidence Test Suite

USF-243 adds executable tests and validator checks for enterprise and ISO-style
control evidence in the test-readiness track. The machine-readable evidence is
`docs/architecture/enterprise-control-evidence-test-suite.json`.

This suite verifies that the repository-level enterprise evidence model remains
connected to semantic service obligations, service-backed test obligations,
evidence ownership, command and commit pins, threat and privacy boundaries,
access, resilience, incident, and non-claim controls.

The suite supports ISO-style evidence organisation only. It does not claim
ISO/IEC 27001 certification, SOC readiness, staging readiness, production
readiness, deployment readiness, live-provider readiness, enterprise production
readiness, product UI readiness, browser E2E readiness, full product readiness product
parity, or final USF-234 acceptance.

Evidence added:

- Test suite: `tests/packages/enterprise-control-evidence-suite.test.ts`
- Validator rules: USF-TEST-READINESS-067 through USF-TEST-READINESS-075
- Planted defects: 067 through 075 under
  `tools/validate-test-readiness/planted-defects`
- Enterprise evidence rows in
  `spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json`

