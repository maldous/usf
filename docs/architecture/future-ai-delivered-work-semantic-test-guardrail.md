# Future AI Delivered Work Semantic Test Guardrail

USF-252 adds an executable guardrail for future AI and developer changes. It fails closed when a change touches semantic contracts, service catalogue rows, generated Compose, adapters, capabilities, API or worker surfaces, provider bindings, validators, commands, fixtures, evidence, tests, planted defects, or coverage gates without the matching semantic, test-obligation, evidence, fixture, validator, and non-claim updates.

The machine-readable authority for this guardrail is `docs/architecture/future-ai-delivered-work-semantic-test-guardrail.json`. The existing obligation manifest remains the broader test-readiness obligation source; this guardrail adds path-to-obligation diagnostics and weakening-detector coverage for future changes.

## Guardrail Coverage

- Change impact detector: maps changed file classes to path patterns, obligation facets, required update classes, and diagnostic templates.
- Coupled update policy: requires semantic authority, test obligation, fixture, coverage, enterprise evidence, validator or planted-defect, and non-claim updates when the changed surface requires them.
- Weakening detectors: catch removed or weakened tests, in-memory substitutes for service-backed claims, lowered coverage thresholds, unapproved exclusions, removed planted defects, missing audit/reset evidence, missing non-claims, generated Compose authority inversion, and stale evidence passes.
- Generated Compose boundary: generated Compose remains derivative and cannot satisfy test-readiness claims without service catalogue and obligation evidence.
- Failure diagnostics: validator output must identify changed path class, missing facet, service or capability, owner issue, and required fix.

## Workflow Boundary

A governed future change updates semantic authority, generated test obligations, tests or proofs, fixture or evidence rows, validators or planted defects when relevant, and explicit non-claims in the same PR. Linear tracks the work; repository artefacts and validators remain authority.

## Non-Claims

This guardrail does not claim final test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, full product readiness, or final USF-234 acceptance.
