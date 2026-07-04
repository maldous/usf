# Non-Destructive Pre-Staging External Smoke Proof Gate

Issue: USF-271
Parent: USF-267

The machine-readable gate is `docs/architecture/pre-staging-external-smoke-proof-gate.json`.

The smoke gate is non-destructive. It uses only safe proof/control routes and safe methods. It does not use real tenant data, real secrets, live application state, or persistent staging or production data mutation.

Current decision: staging-specific enablement remains blocked.

Resolved:

- `1e100.network` and `aldous.info` both redirect `/.well-known/usf-public-edge.json` from plain HTTP to same-host HTTPS.

Remaining blocker:

- Proof/control routes currently declare `Cache-Control: no-store` and run through repo-owned Netlify Function responses, but provider evidence still includes low nonzero `Age` observations.

Required operator or decision actions: provide a proof-route implementation or provider setting that emits no nonzero `Age` on no-store proof/control responses, or record a later explicit human-approved reclassification that Netlify Durable bypass plus Edge miss with low `Age` is acceptable bounded evidence. Then rerun the external cache proof and pre-Staging smoke proof.

Non-claims: this does not claim staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or v2-proof tag authorisation.
