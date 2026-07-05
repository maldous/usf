# Proof Artifact Retention Policy

| | |
|---|---|
| **Document type** | Architecture governance |
| **Status** | Active. |
| **Relates to** | `artifacts/proof-cockpit/machine-runs/`, `evidence/proof-evidence/proof-cockpit/staging-evidence-store.json`. |

## Policy

Machine-QA runs are large (~50 MB each). To keep the repository healthy while preserving an auditable chain of custody:

1. **Keep the latest run in full** under `artifacts/proof-cockpit/machine-runs/<ts>/`, referenced by `staging-evidence-store.json.latestMachineRun`.
2. **Keep one prior run in full** for diff/regression comparison.
3. **Prune older superseded run payloads.** Each superseded run's identity, source SHA, counts, and supersession reason remain permanently in `staging-evidence-store.json.machineRunHistory` and `supersessionHistory`; only the bulk payload directory is removed.
4. **Every `machineRunHistory` entry MUST correspond to a retained payload or carry an explicit `payloadPruned: true` marker** so history never contains dangling run pointers.
5. **Promotion is automated** (`proof-cockpit:promote`); no run is copied into the repository by hand.

## Rationale

Supersession is recorded as metadata, so pruning a superseded payload never loses the audit trail — it loses only the reproducible bulk artifacts, which `proof-cockpit:machine-qa` can regenerate deterministically from the pinned source SHA.

## Non-claim

Retention posture is repository hygiene. It makes no readiness or certification claim.
