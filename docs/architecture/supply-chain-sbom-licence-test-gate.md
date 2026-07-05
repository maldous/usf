# Supply-chain SBOM and licence test gate

Issue: USF-255.

Parent coordination issue: USF-234.

This artefact is the human-readable companion to `docs/architecture/supply-chain-sbom-licence-test-gate.json`.

## Purpose

USF-255 adds an issue-scoped regression gate for dependency, package-manager/toolchain, lockfile, workspace-boundary, licence, advisory, SBOM, provenance, signing, and Compose-image supply-chain posture.

The gate is deliberately bounded. It records what the current repository can prove from checked-in artefacts and records blockers where stronger SBOM, provenance, signing, or image-pinning claims would require shared command, validator, manifest, lockfile, package, CI, Compose, or enterprise-evidence edits outside this worker's owned paths.

## Current evidence covered

- Root package manager pin: `pnpm@11.9.0`.
- Root engine pins: Node `>=24.16.0` and pnpm `>=11.9.0`.
- Package-manager configuration posture: `.npmrc` records `engine-strict=true` and `shared-workspace-lockfile=true`; `pnpm-workspace.yaml` records explicit minimum-release-age exclusions for the current pinned fast-moving packages.
- Root direct dependency posture: 26 runtime dependencies and 11 dev dependencies, all expected to use exact package versions.
- Lockfile posture: `pnpm-lock.yaml` lockfile version `9.0`, root importer dependency alignment, and the `protobufjs` override pin.
- Workspace posture: 32 workspace packages under `apps/*`, `capabilities/*`, `adapters/*`, and `packages/*`, with external dependencies centralised at the root package.
- SDK governance linkage: provider SDK rows in `spec/instances/enterprise-evidence/repository-enterprise-evidence-model.json` must retain licence posture, security advisory posture, and update owner fields.
- Compose image posture: 34 image-bearing catalogue services, 33 generated test Compose image lines, three digest-pinned service IDs, and explicit blockers for the current `clamav/clamav:stable` moving tag and the missing generated `sonar-oidc-plugin` image line.
- Validator boundary: the shared test-readiness validator already enforces the generic USF-255 expanded-category obligation row. The issue-local Vitest suite is the concrete USF-255 supply-chain gate for lockfile, licence, advisory, SBOM-boundary, provenance-boundary, signing-boundary, and image-policy regression checks.
- Planted-defect coverage: the issue-local fixture covers floating dependency specifiers, missing lockfile evidence, missing licence posture, missing advisory posture, missing SBOM or bounded deferral evidence, unsupported readiness overclaims, floating image tags without blockers, missing image owners, and missing package-manager/toolchain posture.

## Bounded blockers

- `usf255-sbom-generation-not-wired`: no current package script or test-readiness command generates and validates a fresh SBOM artefact.
- `usf255-licence-advisory-fresh-inventory-deferred`: current handover evidence records licence and audit posture, but this issue does not add fresh committed licence or advisory inventory artefacts.
- `usf255-compose-image-moving-tag-clamav`: the current service catalogue records `clamav/clamav:stable`, which remains a moving-tag blocker.
- `usf255-compose-generated-target-missing-sonar-oidc-plugin`: the service catalogue records `sonar-oidc-plugin` with `curlimages/curl:8.11.1`, but the generated test Compose file does not currently include that image line.
- `usf255-release-and-container-provenance-deferred`: proof-anchor workflow evidence exists, but this issue does not claim package signing, release artefact provenance, or container signing.
- `usf255-source-disposition-coverage-deferred`: `corepack pnpm verify` fails `USF-IMPL-002` because the two new test files require target-file source disposition coverage, and that matrix or validator-owned coverage path is outside this issue worker's owned paths.

## Non-claims

This gate does not claim final test readiness, staging readiness, production readiness, deployment readiness, live-provider readiness, SOC readiness, ISO certification, enterprise production readiness, product UI readiness, browser E2E readiness, full product readiness, production supply-chain maturity, or final USF-234 acceptance.
