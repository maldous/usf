# Public FQDN Proof Source-Use Disposition Matrix

This matrix records source-use treatment for the USF-263 external DNS, TLS,
HTTPS, and public proof-route harness. It uses the USF public FQDN semantic
contract as authority. Cloudflare, Caddy, and historical React configuration may
be evidence or provider-boundary context only; they are not semantic authority.

Linear source issue: USF-263.

Related issues: USF-261, USF-262, USF-264, USF-265.

## Target Files

| Target file | Treatment | Source-use basis | Rationale |
| ----------- | --------- | ---------------- | --------- |
| `packages/proof/src/public-fqdn-proof.ts` | new-with-rationale | USF-262 public FQDN semantic contract, Node DNS/TLS/HTTPS platform APIs, and the USF-263 proof-gate requirement | Adds a strict proof-only command for public DNS resolution, TLS certificate host coverage, HTTPS route delivery, proof marker evidence, gateway neutrality, Cloudflare API-secret non-dependency, Caddy non-requirement, and explicit non-claims. It imports no React runtime/application code and does not encode Caddy as required. |
| `packages/proof/src/index.ts` | evidence-only-support | Existing proof package export pattern | Exports the USF-263 proof function without changing runtime provider semantics. |
| `package.json` | new-with-rationale | Existing proof command wiring pattern | Adds strict public FQDN proof scripts for all, staging, and production scopes. The commands are intentionally not part of the local Test readiness gate because they depend on public FQDN availability. |
| `Makefile` | new-with-rationale | Existing proof target pattern | Adds public FQDN proof targets as command aliases for USF-263. |
| `docs/architecture/public-fqdn-external-proof-gate.json` | issue-owned-evidence | USF-262 semantic contract and USF-263 acceptance criteria | Records machine-readable external proof-gate state, current public DNS/TLS evidence, route delivery blocker, v2-proof blocking state, command wiring, and non-claims. |
| `docs/architecture/public-fqdn-external-proof-gate.md` | evidence-only-support | Machine-readable USF-263 proof-gate artefact | Provides concise human-readable notes for the proof boundary, current Cloudflare 521 blocker, and non-claims. |
| `tools/validate-public-fqdn/validate-public-fqdn.py` | issue-scoped-validator-extension | Existing USF-262 public FQDN validator pattern | Adds USF-PUBLIC-FQDN-009 through USF-PUBLIC-FQDN-012 to fail closed on missing external proof evidence, stale or no-op proof commands, unsafe blocked-state handling, incomplete DNS/TLS/route evidence, Caddy-required overclaims, and readiness overclaims. |
| `tools/validate-public-fqdn/planted-defects/009-external-proof-missing.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves the validator blocks missing external proof-gate evidence. |
| `tools/validate-public-fqdn/planted-defects/009-external-required-fqdn-missing.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves the validator blocks missing required FQDN proof rows. |
| `tools/validate-public-fqdn/planted-defects/010-noop-external-proof-command.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves the validator blocks no-op public FQDN proof commands. |
| `tools/validate-public-fqdn/planted-defects/011-blocked-state-does-not-block-v2-proof.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves the validator blocks unsafe v2-proof authorization from a blocked proof state. |
| `tools/validate-public-fqdn/planted-defects/012-caddy-required-proof-overclaim.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves the validator blocks Caddy-required gateway overclaims in external proof evidence. |
| `tools/validate-public-fqdn/planted-defects/012-external-nxdomain-accepted.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves the validator blocks NXDOMAIN acceptance for required public FQDNs. |
| `tools/validate-public-fqdn/planted-defects/012-external-private-only-resolution.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves the validator blocks private-only DNS resolution for required public FQDNs. |
| `tools/validate-public-fqdn/planted-defects/012-missing-tls-proof.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves the validator blocks missing TLS and certificate host-coverage evidence. |
| `tools/validate-public-fqdn/planted-defects/012-proof-endpoint-missing-on-pass.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves the validator blocks passing evidence when the proof endpoint marker is absent. |
| `tools/validate-public-fqdn/planted-defects/012-staging-readiness-proof-overclaim.json` | evidence-only-support | Existing planted-defect selftest pattern | Proves the validator blocks staging readiness overclaims in external proof evidence. |

## Boundary Confirmation

USF-263 adds a fail-closed public FQDN proof gate. It currently records that DNS
resolution and TLS host coverage are observable for the declared root FQDNs, but
proof endpoint delivery is blocked because both allowed routes return Cloudflare
521. It does not prove staging readiness, production readiness, deployment
readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification,
enterprise production readiness, product UI readiness, browser E2E readiness,
full React product parity, or v2-proof tag authorization.
