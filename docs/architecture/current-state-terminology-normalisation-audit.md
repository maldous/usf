# Current-State Terminology Normalisation Audit

|                     |                                                                 |
| ------------------- | --------------------------------------------------------------- |
| **Issue scope**     | USF-231                                                         |
| **Prior authority** | `docs/architecture/current-state-foundation-authority-index.md` |
| **Machine data**    | `docs/architecture/current-state-terminology-normalisation-audit.json` |
| **Status**          | Audit and strategy input for USF-232 and USF-233                |

This audit records the active command, documentation, validator, proof, and agent-facing terminology that remains after the `v2-foundation` baseline and USF-230 current-state routing pass. It does not rename commands or remove historical lineage. It classifies terms so future work can prefer current-state language while preserving compatibility aliases and audit evidence.

The audit preserves the USF authority order. Historical `../react` evidence, source-use matrices, React parity matrices, lane orchestration, closure-tier artefacts, and bootstrap ancestry remain retained lineage or transitional scaffolding unless a current issue explicitly authorises their use. Generated reports remain lower authority than semantic definitions, validators, proof evidence, and source implementation.

## Surfaces Inspected

| Surface | Files or commands inspected | Disposition |
| ------- | --------------------------- | ----------- |
| Make command surface | `Makefile` targets including `verify`, `parity`, `enterprise-validate`, `runtime-validate`, `sonarqube-assurance-proof`, and proof targets | Active surface requiring current-state aliases and help grouping in USF-232 |
| Package scripts | `package.json` scripts including `verify`, `parity`, `repo:validate`, `proof:bootstrap`, `proof:assurance:sonarqube`, runtime, provider, and proof scripts | Active surface; preserve scripts for compatibility and CI/proof wiring |
| Validator directories | `tools/validate-spec/`, `tools/validate-bootstrap/`, `tools/validate-parity/`, `tools/validate-enterprise/`, `tools/validate-runtime/`, `tools/validate-compose/` | Active validators; historical names may remain as compatibility where they enforce current assurance |
| Agent routing | `AGENTS.md`, `CODEX.md`, `docs/architecture/current-state-foundation-authority-index.*` | Active guidance; should point agents to current-state command aliases once USF-232 adds them |
| Developer handover | `README.md`, `docs/architecture/dev-readiness-validation-and-handover.*` | Current developer entry point; should prefer canonical Make aliases after USF-232 |
| Historical matrices and closure documents | `docs/architecture/parity-*`, `docs/architecture/complete-react-to-usf-*`, `docs/architecture/usf-133-*`, lane and gap-register artefacts | Retained lineage or transitional scaffolding, not active future authority |
| Sonar assurance proof | `docs/architecture/sonarqube-service-semantic-proof-boundary.*`, `docs/architecture/static-analysis-quality-gate-disposition-matrix.json`, `packages/proof/src/sonarqube-composed-proof.ts`, `adapters/assurance/src/index.ts` | Active assurance proof surface; USF-233 should make the zero-open-issue gate explicit for the supported local scan scope |

## Term Disposition

| Term | Current use | Classification | Normalisation decision |
| ---- | ----------- | -------------- | ---------------------- |
| `verify` | Primary full local gate in Make and package scripts | canonical-current | Keep as the compatibility-stable full gate; add a more descriptive alias such as `foundation` or `dev-ready` in USF-232 without removing `verify`. |
| `repo:validate` | Package script for broad repository validation | canonical-current | Keep; expose a Make alias such as `validate-evidence` in USF-232. |
| `enterprise` | Enterprise evidence and assurance validation posture | canonical-current | Keep for control-support evidence; add or document `assurance` / `validate-assurance` aliases where clearer. |
| `parity` | Validator suite inherited from React-to-USF reconciliation | compatibility-alias | Keep because validators remain authoritative, but describe as foundation coverage validation rather than full React parity. Add `validate-coverage` alias in USF-232. |
| `bootstrap` | Foundational ancestry proof and validator naming | compatibility-alias | Keep `proof:bootstrap` and `validate-bootstrap` until replacement authority exists. Prefer `foundation-baseline` wording in docs and future aliases. |
| `lane` | USF-184 through USF-192 orchestration wrappers and historical docs | transitional-scaffolding | Retain for audit trail only. Do not use for future active command or proof names. |
| `closure-tier` | USF-133 closure gate evidence | transitional-scaffolding | Retain as historical gate evidence. Do not use as an active readiness shortcut. |
| `React parity` | Historical migration/disposition terminology | historical-lineage | Retain in lineage records and non-claims. Do not present as current product parity or future implementation authority. |
| `../react` | Historical source and semantic evidence | historical-lineage | Retain as lineage only. Do not copy or mirror runtime/application paths. |
| `v2-bootstrap` | Historical baseline/ancestry marker | historical-lineage | Retain as historical reference only. Do not introduce new current-state names using this token. |
| `v2-foundation` | One-off annotated baseline tag | canonical-current baseline anchor | Keep only as the immutable baseline tag authorised for this repository. It is not a general `v2-*` naming exception. |
| `dev-readiness` | Developer and AI-agent handover scope | canonical-current | Keep when bounded to local development and handover evidence. Do not broaden to test, staging, production, deployment, live-provider, SOC, ISO, enterprise production, product UI, browser E2E, or full React product parity readiness. |
| `SonarQube assurance` | Bounded composed static-analysis proof | canonical-current bounded assurance | Keep as assurance language. USF-233 should add a current-state alias such as `sonar-quality-gate-proof` only if it preserves the existing `sonarqube-assurance-proof` compatibility target. |

## Current-State Command Naming Strategy

USF-232 should optimise the command surface by adding discoverable current-state aliases while preserving existing scripts and targets as compatibility. The recommended command model is:

| Current-state concept | Recommended Make target | Existing compatibility target or script |
| --------------------- | ----------------------- | --------------------------------------- |
| Install dependencies | `setup` | `install` |
| Full local foundation gate | `foundation` or `dev-ready` | `verify`, `corepack pnpm verify` |
| Foundation coverage validators | `validate-coverage` | `parity`, `corepack pnpm parity` |
| Assurance and control evidence validation | `validate-assurance` | `enterprise-validate`, `corepack pnpm enterprise:validate` |
| Evidence and repository validation | `validate-evidence` | `corepack pnpm repo:validate` |
| Runtime proof and validation | `runtime-proof`, `runtime-validate` | Existing targets are already clear |
| Compose validation | `compose-validate`, `compose-check-generated`, `compose-policy` | Existing targets are already current enough |
| Sonar quality gate proof | `sonar-quality-gate-proof` | `sonarqube-assurance-proof`, `corepack pnpm proof:assurance:sonarqube` |

Compatibility aliases should remain until a later issue proves all references, documentation, CI, validators, and developer workflows have moved safely. USF-232 should not remove historical command names in the first optimisation pass.

## Compatibility Requirements

- Keep `make verify` as a stable entry point because the dev-readiness handover and existing validation practice depend on it.
- Keep `make parity` and `corepack pnpm parity` as compatibility aliases for the current validator suite, but describe their current role as foundation coverage validation rather than full React parity.
- Keep `proof:bootstrap` and `validate-bootstrap` as compatibility proof/validator names until a separately authorised replacement preserves their evidence semantics and planted-defect coverage.
- Keep `sonarqube-assurance-proof` while USF-233 adds zero-open-issue assurance. A new alias must not weaken the existing proof command.
- Do not rename files, validators, or proof scripts in USF-232 unless every reference, validator, planted defect, PR workflow, and handover document is updated in the same PR.

## Execution Recommendations

USF-232 should:

- add Make help output or a command index that groups current-state commands by developer workflow;
- add current-state aliases for setup, foundation validation, coverage validation, assurance validation, and evidence validation;
- retain old names as compatibility aliases;
- update `AGENTS.md`, README, and dev-readiness handover language to prefer current-state aliases while still naming compatibility commands;
- run full validation before merge because Makefile command routing is a high-conflict surface.

USF-233 should:

- keep the supported Sonar scope bounded to local composed SonarQube and synthetic scan data unless stronger authority exists;
- make the zero-open-issue requirement explicit in the proof output, evidence boundary, and validator checks;
- preserve the existing Sonar non-equivalence boundary: local repository validation is not equivalent to SonarQube service operation, and local Sonar proof is not staging, production, live-provider, SOC, ISO, enterprise production, full React product parity, or broader readiness proof;
- keep `@sonar/scan` SDK use inside the assurance adapter/proof boundary and retain exact dependency pinning.

## Non-Claims

This audit does not claim test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or any readiness beyond the already evidenced bounded dev-readiness baseline.

It does not remove historical lineage, change runtime/provider behaviour, weaken validators, weaken planted defects, weaken proof coverage, change generated Compose outputs, or close USF-232 or USF-233.
