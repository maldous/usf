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
- The current test-readiness validator already enforces the generic USF-254 expanded category from USF-259. Literal service/profile-level validator and planted-defect coverage for this suite would require edits under `tools/validate-test-readiness/**`, which are outside the USF-254 owned paths.

## Deferred Work

- Add validator checks for the USF-254 suite matrix once the coordinator authorises `tools/validate-test-readiness/**` changes.
- Add planted defects for missing baseline, missing budget, disabled concurrency case, unbounded load, missing cleanup under pressure, and unsupported overclaim when that forbidden path is available.
- Wire a first-class package or Make command only if the coordinator authorises `package.json`, `Makefile`, and command-surface changes.
