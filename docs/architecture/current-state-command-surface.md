# Current-State Command Surface

|                     |                                                                 |
| ------------------- | --------------------------------------------------------------- |
| **Issue scope**     | USF-232                                                         |
| **Input audit**     | `docs/architecture/current-state-terminology-normalisation-audit.md` |
| **Machine data**    | `docs/architecture/current-state-command-surface.json`          |
| **Status**          | Current developer and AI-agent command routing                  |

This document records the current-state command surface introduced by USF-232. It keeps every existing compatibility target intact and adds clearer aliases for future developers and AI agents. The aliases route to existing validation and proof commands; they do not weaken coverage, remove historical command names, or create readiness claims.

## Primary Commands

| Current-state target | Existing target or script | Purpose |
| -------------------- | ------------------------- | ------- |
| `make setup` | `make install` | Install exact pinned dependencies with the frozen lockfile. |
| `make foundation` | `make verify` | Run the full local foundation proof and validation gate. |
| `make dev-ready` | `make verify` | Run the developer and AI-agent handover gate. |
| `make test-ready` | `corepack pnpm test-readiness` | Run the bounded local test-readiness command gate. |
| `make test` | `make test-ready` | Short alias for the bounded local test-readiness command gate. |
| `make test-composed` | `corepack pnpm test-readiness:composed` | Run the composed semantic harness and deterministic fixture lifecycle proof. |
| `make test-assurance` | `corepack pnpm test-readiness:assurance` | Run the bounded local SonarQube zero-open-issue proof. |
| `make validate-foundation` | `make verify` | Compatibility-stable full local foundation validation. |
| `make validate-coverage` | `make parity` | Run the foundation coverage validator suite without implying full React parity. |
| `make validate-assurance` | `make enterprise-validate` | Run the enterprise assurance and evidence validator. |
| `make validate-evidence` | `corepack pnpm repo:validate` | Run repository evidence and governance validators. |
| `make sonar-zero-issue-proof` | `make sonarqube-assurance-proof` | Run the bounded local SonarQube zero-open-issue proof for the supported synthetic scan scope. |
| `make assurance` | `make validate-assurance` | Short current-state alias for assurance evidence validation. |
| `make evidence` | `make validate-evidence` | Short current-state alias for evidence validation. |

`make help` and `make commands` print the grouped command surface.

## Compatibility Boundaries

The following existing names remain valid and intentionally unchanged:

- `make verify`
- `make parity`
- `make enterprise-validate`
- `make runtime-proof`
- `make runtime-validate`
- `make test-compose`
- `make test-ready`
- `make test-composed`
- `make test-assurance`
- `make sonar-zero-issue-proof`
- `make sonarqube-assurance-proof`
- package scripts including `verify`, `parity`, `repo:validate`, `test-readiness`, `test-readiness:composed`, `test-readiness:assurance`, `proof:bootstrap`, and `proof:assurance:sonarqube`

These names are compatibility entry points. They do not imply full React parity, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, or broader readiness than the merged evidence supports.

## Preservation Commitments

- No target was removed.
- No package script was removed.
- No proof command was removed.
- No validator was weakened.
- No planted defect was removed.
- No runtime or provider behaviour changed.
- No generated Compose output changed.
- Historical terminology remains retained as compatibility or lineage.

## Follow-Up Boundary

USF-238 owns the test-readiness command surface. `make test-ready` is the
bounded local command gate for the test-readiness track and routes to
`corepack pnpm test-readiness`. It does not claim final test readiness before
USF-234 acceptance.

USF-233 owns Sonar zero-open-issue quality gate assurance. `make sonar-zero-issue-proof`
and `make test-assurance` are current-state entry points for the supported local
synthetic scan scope and route to the same SonarQube proof; they do not claim
broader SonarQube readiness.

## Non-Claims

This command-surface optimisation does not claim test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO/IEC 27001 certification, enterprise production readiness, product UI readiness, browser E2E readiness, full React product parity, or any readiness beyond the already evidenced bounded dev-readiness baseline.
