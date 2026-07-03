# Performance Concurrency Resource Regression Suite

USF-254 defines an issue-scoped deterministic regression suite for performance, concurrency, bounded load, resource budgets, queue saturation, and cleanup behaviour. The suite uses synthetic tick and work-unit budgets only. It does not run destructive load, does not use real timers, and does not claim production capacity or load-test certification.

Machine-readable evidence is in `docs/architecture/performance-concurrency-resource-regression-suite.json`. The executable owned test is `tests/packages/performance-concurrency-resource-regression-suite.test.ts`.

## Supported Scope

- Maps all 38 semantic service obligation rows to either a deterministic budget profile or an explicit bounded disposition.
- Maps all 10 generated test Compose profiles to deterministic startup and cleanup budgets.
- Covers latency, throughput, bounded concurrency, queue saturation, retry budgets, timeout budgets, memory/value-free evidence boundaries, resource limits, and cleanup under pressure.
- Uses deterministic synthetic loops and counters. Time is represented as ticks, not wall-clock duration.
- Cross-checks the USF-254 expanded category from the semantic service test obligation manifest and the USF-248 fixture corpus.

## Boundaries

- No service-backed performance claim is made.
- No production scale, production readiness, staging readiness, live-provider readiness, SOC readiness, ISO certification, product UI readiness, browser E2E readiness, full React parity, or final USF-234 acceptance is claimed.
- The test-readiness validator enforces the generic USF-254 expanded category from USF-259 and the issue-specific suite matrix here.
- USF-TEST-READINESS-081 through USF-TEST-READINESS-087 fail closed for missing suite linkage, service/profile budget disposition gaps, missing baselines or budgets, unsafe concurrency/load/resource budgets, missing cleanup under pressure, unsupported overclaims, and missing enterprise evidence linkage.
- Nine planted defects across 081 through 087 selftest those validator classes, including independent missing-baseline, missing-budget, disabled-concurrency, and unbounded-load cases.

## Command Boundary

- Wire a first-class package or Make command only if the coordinator authorises `package.json`, `Makefile`, and command-surface changes.
