# Target Implementation Topology Plan

| | |
|---|---|
| **Document type** | Architecture / implementation topology authorization plan |
| **Status** | Draft / implementation-gate planning |
| **Authority level** | Semantic-definition planning guidance; subordinate to the Charter, Authority Model, accepted ADRs, validators, runtime proof evidence, and future implementation directive |
| **Issue scope** | USF-63 |
| **Primary inputs** | `docs/architecture/directory-and-file-naming-standard.md`, `docs/architecture/capability-source-coverage-matrix.md`, `docs/architecture/authentication-slice-source-use-disposition-matrix.md`, `spec/registries/authentication-slice-source-import-manifest.json`, `spec/instances/` |

This plan defines the only implementation-shaped destination directories that a later USF-61 implementation directive may authorise for the authentication proof-substrate slice. It creates no directories, writes no runtime code, imports no source code, emits no evidence, and does not weaken the current implementation-directory stop rules.

## Whole-Platform Reconciliation Note

The whole-platform implementation directive draft at `docs/architecture/implementation-extraction-directive.md` is broader than this topology plan. This plan currently enumerates only the authentication/identity proof-substrate roots below. Every other semantic slice remains under a pre-file slice gate: before files are created, a reviewed topology update must name that slice's roots and exact target files, the source-use disposition matrix must cover those files, and the validator must enforce the added roots. This plan must not be read as authorising broad platform roots by implication.

## USF-39 Post-Start Local Dev/Test Bootstrap Topology

After the separate USF-39 start action recorded for run `20260627T235923Z-f80da39`, this plan also authorises the local dev/test bootstrap topology listed below. This post-start topology is limited to the active bootstrap goal, the signed USF-100 directive, ADR 0009, and the start record in `docs/architecture/bootstrap-start.json`.

The authorised post-start roots are:

- `apps/api/`
- `apps/work/`
- `capabilities/auth/`
- `capabilities/tenant/`
- `capabilities/audit/`
- `capabilities/notify/`
- `capabilities/files/`
- `capabilities/jobs/`
- `capabilities/config/`
- `adapters/db/`
- `adapters/idp/`
- `adapters/store/`
- `adapters/bus/`
- `adapters/wf/`
- `adapters/mail/`
- `adapters/secrets/`
- `adapters/obs/`
- `packages/core/`
- `packages/ports/`
- `packages/contracts/`
- `packages/openapi/`
- `packages/test/`
- `packages/proof/`
- `packages/source/`
- `tests/apps/`
- `tests/capabilities/`
- `tests/adapters/`
- `tests/packages/`

The exact target files and their source-use treatments are named in `docs/architecture/bootstrap-source-use-disposition-matrix.md`. Any implementation file outside those roots or not named in that matrix remains blocked.

This section does not authorise staging, production, live-external-provider, deployment, or production-live readiness. It does not authorise direct source-lineage runtime/application copy, source-lineage path mirroring, generated-report authority, or schema activation.

## USF-1014 App-Surface Package-Boundary Topology

USF-1014 authorises a narrow app-surface workspace/package boundary for UI primitives metadata only. This authorisation is limited to the following root and target file:

- `packages/ui/`
- `packages/ui/package.json`

The source-use treatment for this file is recorded in `docs/architecture/app-surface-source-use-disposition-matrix.md`. The package is private, dependency-free, and contains no runtime implementation.

This section does not authorise `apps/web/`, `apps/mobile/`, `packages/app-surface/`, route scaffolds, screen scaffolds, forms, queries, state/cache runtime, auth/session runtime, i18n runtime, accessibility runtime, notification provider setup, ads/monetisation provider setup, store setup, deployment, staging, live-provider integration, production readiness, compliance readiness, or human-acceptance readiness. Those paths remain blocked until their owning app-surface child issue records exact target files, source-use disposition coverage, validator support, and proof expectations.

## USF-1015 app-surface shared-client consumption path

USF-1015 authorises a narrow dependency-free local shared-client consumption adapter. This authorisation is limited to the following root and target files:

- `packages/client/`
- `packages/client/package.json`
- `packages/client/src/index.ts`
- `docs/architecture/app-surface-shared-client-consumption-path.json`
- `tests/packages/app-surface-shared-client-consumption.test.ts`

The source-use treatment for these files is recorded in `docs/architecture/app-surface-source-use-disposition-matrix.md`. The package is private, dependency-free, and contains only local adapter validation code over repository-owned semantic and generated-client mapping artefacts.

This section does not authorise `apps/web/`, `apps/mobile/`, `packages/app-surface/`, web routes, mobile screens, route scaffolds, forms, query clients, state/cache runtime, auth/session runtime, i18n runtime, accessibility runtime, notification provider setup, ads/monetisation provider setup, store setup, package publication, generated SDK readiness, external provider setup, credentials, deployment, Compose proof, staging, live-provider integration, production readiness, compliance readiness, monetisation readiness, or human-acceptance readiness. Those paths remain blocked until their owning app-surface child issue records exact target files, source-use disposition coverage, validator support, and proof expectations.

## USF-1016 app-surface local in-memory runtime

USF-1016 authorises a narrow dependency-free local in-memory app-surface runtime. This authorisation is limited to the following root and target files:

- `packages/app-surface/`
- `packages/app-surface/package.json`
- `packages/app-surface/src/index.ts`
- `docs/architecture/app-surface-local-in-memory-runtime.json`
- `tests/packages/app-surface-local-in-memory-runtime.test.ts`

The source-use treatment for these files is recorded in `docs/architecture/app-surface-source-use-disposition-matrix.md`. The package is private, dependency-free, and contains only a local in-memory component-fixture validator and runner over repository-owned capability, tenant, permission, command, query, validation, error, and audit semantics.

This section does not authorise `apps/web/`, `apps/mobile/`, web routes, mobile screens, broad route scaffolds, forms, query clients, state/cache runtime, production auth/session runtime, i18n runtime, accessibility runtime, notification provider setup, ads/monetisation provider setup, store setup, package publication, generated SDK readiness, external provider setup, credentials, network calls, deployment, Compose proof, staging, live-provider integration, production readiness, compliance readiness, monetisation readiness, or human-acceptance readiness. Those paths remain blocked until their owning app-surface child issue records exact target files, source-use disposition coverage, validator support, and proof expectations.

## Decision

USF-39 must not create implementation-shaped directories unless USF-61 explicitly cites this plan and the future implementation PR stays within the allowed topology below.

The allowed topology is conditional. A directory listed here is not created or active now; it becomes creatable only when a later explicit implementation directive names the directory, names the files to be created, cites the governing semantic instances, and reconciles every target file to the source-use matrix or to a new-with-rationale entry.

## Allowed Destination Directories

| Directory | Intended responsibility | Semantic authority | Source-disposition evidence |
|---|---|---|---|
| `apps/authentication-api/` | HTTP/API entrypoint and orchestration for the authentication login slice. | `interface.authentication-login-api`, `workflow.authentication-login`, `workflow.authentication-identity-context`, `semantic-contract.authentication-platform` | Source-use rows for authentication server routes and use cases are adapt/rewrite only; direct copy is not authorised. |
| `packages/authentication-domain/` | Domain rules for login, session, authentication settings, state, validation, and error handling. | `semantic-contract.authentication-platform`, `semantic-contract.user-identity-and-tenant-membership`, `semantic-contract.tenant-host-identity-resolution` | Source-use rows for auth/session/usecase files are adapt/rewrite only; evidence-only rows remain non-runtime. |
| `packages/identity-domain/` | Tenant identity, user identity, membership, and host identity abstractions used by authentication. | `semantic-contract.user-identity-and-tenant-membership`, `semantic-contract.tenant-identity-record-and-fqdn`, `semantic-contract.tenant-host-identity-resolution` | Source-use rows for identity repository and identity data lineage are adapt/evidence-only; data migrations remain evidence-only unless later authorised separately. |
| `packages/authorization-policy/` | RBAC and authorization policy decisions needed by the authentication slice. | `semantic-contract.rbac-roles-and-permissions` | Source-use rows for authorization behaviour are adapt only; package names from USF's own source lineage are lineage, not target names. |
| `packages/identity-provider-adapter/` | Provider-mode-aware identity-provider adapter boundary for mock and later external providers. | `provider-mode.mock-identity-provider`, `configuration.provider-mode-selector`, `semantic-contract.authentication-platform` | Source-use rows for provider and OIDC behaviour are adapt/rewrite only; hermetic mock evidence must not become live-provider evidence. |
| `packages/authentication-observability/` | Audit, event, and observability emission contracts for authentication login. | `audit.authentication-login`, `event.authentication-login-audit`, `observability.authentication-login-audit` | Source-use rows for audit and observability files are adapt/evidence-only; generated reports and proof scripts remain evidence only. |
| `config/authentication/` | Declarative configuration shape for authentication provider selection and environment binding. | `configuration.provider-mode-selector`, `environment.hermetic`, `environment.production-shaped`, `provider-mode.mock-identity-provider` | Configuration-file rows in the source-use matrix are evidence-only unless USF-61 marks a target file as new-with-rationale. |

## Naming Rules

Future files and directories under the allowed topology must use clean final-state names, lowercase kebab-case where USF controls the name, and stable semantic purpose rather than lifecycle, source origin, or migration status.

Target paths must not reuse historical source path structure. In particular, these historical path segments do not become target architecture by themselves:

- `apps/platform-api/src/server/`
- `apps/platform-api/src/usecases/`
- `apps/platform-api/src/db/migrations/`
- `packages/adapters-keycloak/`
- `packages/adapters-postgres/`
- `packages/authorisation-runtime/`
- `infra/modules/`

Those paths may be cited only as source evidence or source-use rows.

## Source-Disposition Rules

Every future implementation file under an allowed directory must use one of the target-file treatments defined by `docs/architecture/authentication-slice-source-use-disposition-matrix.md`:

- source-derived-adapt;
- source-derived-rewrite;
- new-with-rationale;
- evidence-only-support.

No target file may be created solely because a recorded source path exists. No target file may directly copy runtime/application code from USF's own source lineage. Evidence-only rows cannot produce runtime code. Generated-report rows cannot produce runtime code or authority. Data-migration rows remain evidence-only unless a later data/migration directive authorises migration artefacts.

## Directories That Remain Blocked

Any implementation-shaped directory not listed in the allowed topology remains blocked for the implementation proof substrate.

Still blocked examples include:

- `apps/platform-api/`
- `apps/web/`
- `packages/adapters-keycloak/`
- `packages/adapters-postgres/`
- `packages/authorisation-runtime/`
- `services/`
- `src/`
- `infra/`
- `scripts/`
- `deploy/`
- `docker/`
- `k8s/`
- `terraform/`

USF-61 must not cite this plan as authority for any unlisted directory. A later directory may be added only by a reviewed topology-plan update or a more specific accepted implementation directive that preserves the Charter and Authority Model.

## USF-61 Citation Requirement

USF-61 can cite this plan as follows:

> USF-63 conditionally authorises only the proof-substrate implementation directories listed in `docs/architecture/target-implementation-topology-plan.md`. The future USF-39 directive must name each target file, keep source-path mirroring forbidden, reconcile every file to the source-use matrix or a new-with-rationale entry, and treat every unlisted implementation-shaped directory as blocked.

## Validation Expectations

Future implementation PRs must run:

- `python3 tools/validate-spec/validate-spec.py all`;
- `python3 tools/validate-spec/validate-spec.py pr --base origin/main --head HEAD`;
- any later USF-60 implementation-artefact validator mode if added before extraction.

The PR validator must fail closed when:

- an added implementation path is outside the allowed topology;
- an added implementation file has no source-disposition or new-with-rationale coverage;
- a target path mirrors a historical source path;
- an evidence-only row is used as runtime code;
- a generated report is treated as authority;
- a provider or environment claim is upgraded by directory naming or target placement.

## Non-Goals

- No implementation directory is created.
- No implementation/runtime code is created or imported.
- No source file from USF's own source lineage is copied.
- No evidence record is created.
- No generated report is created.
- No schema lifecycle is changed.

## Readiness

This plan closes the USF-63 topology-planning boundary only. It does not start USF-39 and does not authorise implementation by itself. USF-39 remains gated by USF-61, current proof/readiness blockers, validator guards, source-use reconciliation, and a separate explicit implementation directive.

## USF-1017 app-surface web bounded local scaffold

USF-1017 authorises the following bounded local web scaffold paths only:

- `apps/web/`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/next-env.d.ts`
- `apps/web/next.config.mjs`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/src/route-registry.ts`
- `docs/architecture/app-surface-web-bounded-local-scaffold.json`
- `tests/apps/app-surface-web-bounded-local-scaffold.test.ts`

The scaffold is a Next.js adapter over governed USF route, capability, permission, tenant, privacy, validation, error, audit, and component-fixture semantics. It does not create provider setup, credentials, CDN configuration, DNS changes, public route proof, deployment, staging proof, production proof, web readiness, live-provider readiness, compliance readiness, monetisation readiness, store readiness, accessibility compliance, internationalisation readiness, SEO readiness, or human acceptance.

USF-1017 authorises exact root package pins for Next.js and React only where required by the bounded local web scaffold. It does not authorise analytics SDKs, ads SDKs, CMP or UMP SDKs, deployment SDKs, provider SDKs, remote cache tooling, task graph tooling, or Testcontainers.
