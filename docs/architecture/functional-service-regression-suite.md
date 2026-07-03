# Functional Service Regression Suite

Issue: USF-244. Parent: USF-234.

This document describes the bounded functional regression suite generated from the semantic service test obligation manifest. The machine-readable authority for this issue is docs/architecture/functional-service-regression-suite.json.

## Scope

The suite maps every USF-244 semantic contract obligation and every USF-244 service obligation into deterministic positive, negative, authorization, tenant-isolation, audit, readiness, and provider-boundary regression cases. It uses the USF-239 obligation manifest, USF-241 semantic unit suite, USF-242 composed integration matrix, and USF-248 fixture corpus as inputs.

Service-backed claims remain tied to composed integration and fixture evidence. This suite must not satisfy a service-backed test-readiness claim through an in-memory or process-local substitute.

## Evidence

- Semantic regression rows: 67
- Service regression rows: 38
- Capability domains: 14
- Test suite: tests/packages/semantic-functional-regression-suite.test.ts
- Validator rules: USF-TEST-READINESS-061 through USF-TEST-READINESS-066

## Non-Claims

This suite does not claim final test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or final USF-234 acceptance.
