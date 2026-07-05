# Staging Proof Cockpit Source-Use Disposition Matrix

This matrix records source-use treatment for the USF-290 proof cockpit implementation files.
It authorises source-disposition coverage for the plain HTML proof cockpit and machine QA
workbench only. It does not authorise product UI work, product application runtime expansion,
Staging readiness, Production readiness, deployment readiness, live-provider readiness, SOC
readiness, ISO certification, enterprise production readiness, browser E2E readiness, or full
product readiness.

## Target Files

| Target file | Treatment | Source-use basis | Rationale |
| --- | --- | --- | --- |
| `apps/staging-proof-cockpit/package.json` | new-with-rationale | USF-290 proof cockpit acceptance scope, current USF capability registry, current service catalogue, and proof cockpit machine QA evidence model | Defines the isolated package command surface for the proof cockpit workbench without adding product UI dependencies. |
| `apps/staging-proof-cockpit/src/server.mjs` | new-with-rationale | USF-290 plain HTML proof cockpit scope and USF-native closure evidence import requirements | Implements the server-rendered proof cockpit, evidence import pages, source viewer, action ledger, enterprise evidence pages, and current foundation substrate closure route. |
| `apps/staging-proof-cockpit/src/smoke.mjs` | new-with-rationale | USF-290 route coverage and cockpit integrity requirements | Provides fast route, capability-count, source-link, and non-claim smoke checks for the cockpit. |
| `apps/staging-proof-cockpit/src/machine-qa.mjs` | new-with-rationale | USF-290 durable machine QA evidence architecture and external-review bundle requirements | Generates route, capability, service, evidence, action-ledger, screenshot, chain-of-custody, and gap-report evidence for later human review. |

## Boundary Confirmation

These files are proof workbench implementation only. They do not create product UI readiness or
final USF-290 acceptance. Machine evidence remains input to human review; human acceptance is not
automatic.
