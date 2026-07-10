# USF-293 External Review Bundle

This bundle is the stable repository entry point for the USF-293 proof cockpit external-review evidence package.

Source SHA: f89c3579d0ee80b63a05c618c69760a5b33cd9ce
Deployment SHA: f89c3579d0ee80b63a05c618c69760a5b33cd9ce
Source tree hash: d224fb72dbe2dd6e8041783a335dd43d6327440983c6f128b6aea5e56c895740
Run ID: qa-run-2026-07-10T08-45-06-324Z
Authenticated service UI captures: 6
Service evidence records: 40
Screenshot or equivalent artifacts: 94

Latest machine QA: 1282 pass, 0 warnings, 0 failures, 0 unresolved gaps.

Warning inventory:

- ../warning-inventory.json
- ../warning-inventory.md

Primary generated bundle:

- artifacts/proof-cockpit/machine-runs/2026-07-10T08-45-06-281Z/external-review-bundle

Primary report paths:

- ../final-external-review-report.md
- artifacts/proof-cockpit/machine-runs/2026-07-10T08-45-06-281Z/external-review-bundle/external-review-report.md
- /proof/reports/final
- /proof/portfolio

Projection-only re-pin policy:

- Command: corepack pnpm proof-cockpit:projection-repin
- Fresh machine execution: false
- Generated reports are authority: false
- Requires fresh machine QA when source changes: true
- Full machine QA command: corepack pnpm proof-cockpit:machine-qa

Authenticated Composed Service UI evidence uses only scoped staging/test-safe credentials through logical OpenBao references. Credential values are not printed, persisted in committed artifacts, screenshotted, logged, or bundled.

It does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full product readiness, or USF-290 completion.
